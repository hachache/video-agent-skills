"""Review an immutable short-editing draft using the Video Short review interface."""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import uuid
import webbrowser

VENDOR = Path(__file__).parent / 'vendor/video-short/review_page.py'
SPEC = importlib.util.spec_from_file_location('video_short_review_page', VENDOR)
view = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(view)

EXTRA_CSS = """
:root { scrollbar-color: var(--strong-border) var(--rail); scrollbar-width: auto; }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: var(--rail); }
*::-webkit-scrollbar-thumb { background: var(--strong-border); border-radius: 6px; }
*::-webkit-scrollbar-thumb:hover { background: var(--mute); }
:focus-visible { outline: 2px solid var(--pin); outline-offset: 3px; }
.btn:hover:not(:disabled), .send:hover:not(:disabled) { filter: brightness(.92); }
.btn:active:not(:disabled), .send:active:not(:disabled) { transform: translateY(1px); }
.send:disabled { opacity: .65; cursor: wait; }
.pin { border: 0; padding: 0; width: 24px; height: 24px; margin-left: -12px; background: transparent; }
.pin::after { content: ''; position: absolute; width: 8px; height: 8px; top: 8px; left: 8px; border-radius: 50%; background: var(--pin); }
.del { min-width: 44px; min-height: 26px; }
.jump { border: 0; cursor: pointer; }
.jump:hover { color: var(--strong-txt); }
.comment { cursor: default; }
.comment .del { opacity: 1; }
label { display: block; margin: 0 0 6px; font-size: 12px; color: var(--txt); }
.rail-head .dim, .empty, .tc span, .band { color: var(--mute); }
#status { color: var(--txt); }
:root[data-theme="light"] { --mute: #6d675d; --faint: #706b63; }
:root[data-theme="dark"] { --faint: #aaa397; }
@media (max-width: 700px) {
  body { flex-direction: column; }
  .stage { flex: none; padding: 12px 14px 6px; gap: 8px; }
  video { max-height: 43vh; }
  .rail { width: 100%; flex: 1; min-height: 0; border-left: 0; border-top: 1px solid var(--hair); }
  .row { gap: 7px; flex-wrap: wrap; }
  .icon-btn, .play { min-width: 36px; min-height: 36px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
@media (forced-colors: active) { :root { scrollbar-color: auto; } :focus-visible { outline-color: Highlight; } }
"""


def source_time(timeline, seconds):
    for index, insert in enumerate(timeline.get('inserts', [])):
        if insert['t0'] <= seconds < insert['t0'] + insert['dur']:
            return 'i%d+%.3f' % (index, seconds - insert['t0'])
    for key, prefix in [('pause', 'p+'), ('outro', 'o+')]:
        span = timeline.get(key)
        if span and span['t0'] <= seconds < span['t0'] + span.get('dur', 0):
            return prefix + '%.3f' % (seconds - span['t0'])
    speed = timeline.get('speed') or 1
    for start, end, output in timeline['keeps']:
        if output <= seconds < output + (end - start) / speed:
            return round(start + (seconds - output) * speed, 6)
    return None


def page_html(model):
    script = view.JS.replace('const KEY = "review:" + location.pathname;', 'const KEY = "review:" + REVIEW_VERSION;')
    script = script.replace('body: JSON.stringify({ video:', 'body: JSON.stringify({ version: REVIEW_VERSION, video:')
    script = script.replace('document.createElement("div");\n    pin.className', 'document.createElement("button");\n    pin.type = "button";\n    pin.setAttribute("aria-label", `Comment at ${fmt(c.t)}`);\n    pin.className')
    script = script.replace('<span class="chip">${fmt(c.t)} · ${short(c.scene)}</span>', '<button type="button" class="chip jump">${fmt(c.t)} · ${short(c.scene)}</button>')
    script = script.replace('el.onclick = () => seek(c.t);', 'el.querySelector(".jump").onclick = () => seek(c.t);')
    script = script.replace('$("head").style.left =', 'bar.setAttribute("aria-valuenow", t.toFixed(3));\n  $("head").style.left =')
    script = script.replace('if (e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;', 'if (e.isComposing || ["TEXTAREA", "SELECT", "INPUT"].includes(e.target.tagName)) return;')
    script = script.replace('if (e.key === "Enter" && !e.shiftKey)', 'if (e.key === "Enter" && !e.shiftKey && !e.isComposing)')
    for before, after in [('mousedown', 'pointerdown'), ('mousemove', 'pointermove'), ('mouseup', 'pointerup')]:
        script = script.replace('"' + before + '"', '"' + after + '"')
    script += '\nbar.addEventListener("keydown", e => { if (["Home", "End"].includes(e.key)) { e.preventDefault(); seek(e.key === "Home" ? 0 : DUR - 1/FPS); } });\n'
    script = script.replace('  updateSend();\n}', '  if (!state.comments.length) { const empty = document.createElement("p"); empty.className="empty"; empty.textContent="Pause on a frame and add a comment, or approve this draft."; list.appendChild(empty); }\n  updateSend();\n}')
    scenes = json.dumps(model['scenes'], ensure_ascii=False).replace('<', '\\u003c')
    markup = view.PAGE.replace('<html data-theme=', '<html lang="en" data-theme=')
    markup = markup.replace('<video id="v"', '<video aria-label="Draft video" id="v"')
    markup = markup.replace('<div id="bar">', '<div id="bar" role="slider" tabindex="0" aria-label="Video timeline" aria-valuemin="0" aria-valuemax="%s" aria-valuenow="0">' % model['duration'])
    markup = markup.replace('<textarea id="note"', '<label for="note">Comment at this frame</label><textarea id="note"')
    markup = markup.replace('<textarea id="overall"', '<label for="overall">Overall note</label><textarea id="overall"')
    markup = markup.replace('<div id="status">', '<div id="status" role="status" aria-live="polite">')
    script = 'const REVIEW_VERSION = ' + json.dumps(model['version']) + ';\n' + script
    return markup.format(css=view.CSS + EXTRA_CSS, js=script, src='/media', scenes=scenes, dur=model['duration'], fps=model['fps'])


def validated_feedback(data, model):
    if not isinstance(data, dict) or data.get('version') != model['version']:
        raise ValueError('This draft changed. Reopen its review page.')
    comments, overall = data.get('comments', []), data.get('overall', '')
    if not isinstance(comments, list) or len(comments) > 200 or not isinstance(overall, str) or len(overall) > 10000:
        raise ValueError('Invalid review notes.')
    clean = []
    for comment in comments:
        if not isinstance(comment, dict):
            raise ValueError('Invalid frame comment.')
        seconds, note = comment.get('t'), comment.get('note')
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)) or not math.isfinite(seconds) or not 0 <= seconds < model['duration']:
            raise ValueError('Comment time must be inside the video.')
        if not isinstance(note, str) or not note.strip() or len(note) > 8000:
            raise ValueError('A frame comment needs text.')
        scene = next(scene for scene in model['scenes'] if scene['start'] <= seconds < scene['end'])
        clean.append({'t': seconds, 'scene': scene['id'], 'note': note.strip(), 'source_time': source_time(model['timeline'], seconds)})
    return {'version': model['version'], 'video': model['originalVideo'], 'comments': clean, 'overall': overall.strip(), 'approved': not clean and not overall.strip()}


def write_feedback(model, data):
    folder = Path(model['video']).parent / 'feedback' / (time.strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:8])
    folder.mkdir(parents=True)
    frame_step = 1 / model['fps']
    capture_data = {**data, 'comments': [{**comment, 't': max(0, min(model['duration'] - frame_step,
                    math.floor(comment['t'] / frame_step) * frame_step) - .001)} for comment in data['comments']]}
    frames = view.save_frames(capture_data, model['video'], str(folder / 'frames'))
    markdown = view.notes_markdown(data, model['scenes'], model['originalVideo'], frames, model['words'])
    markdown += '\nDraft version: `%s`\n' % model['version']
    for comment in data['comments']:
        markdown += '\nOutput %.3fs → source `%s`: %s\n' % (comment['t'], comment['source_time'], comment['note'])
    (folder / 'feedback.md').write_text(markdown, encoding='utf-8')
    (folder / 'feedback.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    latest = Path(model['project']) / 'files/review'
    for name in ['feedback.md', 'feedback.json']:
        temporary = latest / ('.' + name + '.' + uuid.uuid4().hex)
        temporary.write_bytes((folder / name).read_bytes())
        temporary.replace(latest / name)
    return folder / 'feedback.md'


def make_handler(model, done, result):
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def host_ok(self):
            return self.headers.get('Host') in ['127.0.0.1:%d' % self.server.server_port, 'localhost:%d' % self.server.server_port]

        def reply(self, data, status=200):
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.get(head=False)

        def do_HEAD(self):
            self.get(head=True)

        def get(self, head=False):
            if not self.host_ok():
                return self.send_error(403)
            route = urlsplit(self.path).path
            if route == '/api/version':
                return self.reply({'version': model['version']})
            if route in ['/', '/index.html']:
                body = page_html(model).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                if not head:
                    self.wfile.write(body)
                return
            if route != '/media':
                return self.send_error(404)
            file = Path(model['video'])
            size = file.stat().st_size
            start, end = 0, size - 1
            ranged = self.headers.get('Range')
            if ranged:
                match = re.fullmatch(r'bytes=(\d*)-(\d*)', ranged)
                if not match or not any(match.groups()):
                    return self.send_error(416)
                left, right = match.groups()
                if not left:
                    start = max(0, size - int(right))
                else:
                    start = int(left)
                    end = min(int(right), size - 1) if right else size - 1
                if start >= size or start > end:
                    self.send_response(416)
                    self.send_header('Content-Range', 'bytes */%d' % size)
                    self.end_headers()
                    return
            self.send_response(206 if ranged else 200)
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Length', str(end - start + 1))
            if ranged:
                self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
            self.end_headers()
            if not head:
                try:
                    with file.open('rb') as stream:
                        stream.seek(start)
                        remaining = end - start + 1
                        while remaining:
                            chunk = stream.read(min(1024 * 1024, remaining))
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            remaining -= len(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        def do_POST(self):
            if not self.host_ok():
                return self.send_error(403)
            origin = self.headers.get('Origin')
            if origin and origin != 'http://' + self.headers.get('Host', ''):
                return self.send_error(403)
            if self.path != '/api/feedback':
                return self.send_error(404)
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.send_error(415)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 1024 * 1024:
                    return self.send_error(413)
                data = validated_feedback(json.loads(self.rfile.read(length)), model)
            except (ValueError, TypeError, KeyError, StopIteration) as error:
                return self.reply({'error': str(error)}, 400)
            with lock:
                if not done.is_set():
                    try:
                        result['file'] = write_feedback(model, data)
                    except OSError:
                        return self.reply({'error': 'Could not save notes. Check disk space and retry.'}, 500)
                    done.set()
            self.reply({'ok': True, 'feedback': str(result['file'])})

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', type=Path)
    parser.add_argument('--port', type=int, default=8791)
    parser.add_argument('--timeout', type=int, default=7200)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535 or args.timeout <= 0:
        parser.error('Use a valid port and a positive timeout.')
    model = json.loads(args.model.read_text(encoding='utf-8'))
    done, result = threading.Event(), {}
    handler = make_handler(model, done, result)
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError:
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    url = 'http://127.0.0.1:%d/' % server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print('Review page: ' + url, flush=True)
    if not args.no_open:
        webbrowser.open(url)
    try:
        if not done.wait(args.timeout):
            raise SystemExit('Review timed out. Reopen it to continue; browser drafts are retained.')
        time.sleep(.3)
    finally:
        server.shutdown()
        server.server_close()
    print(result['file'].read_text(encoding='utf-8'))


if __name__ == '__main__':
    main()
