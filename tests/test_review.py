import copy
import importlib.util
import json
import subprocess
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer

SPEC = importlib.util.spec_from_file_location('review', Path(__file__).parents[1] / 'skills/short-editing/review/review.py')
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        video = root / 'files/review/versions/one/video.mp4'
        video.parent.mkdir(parents=True)
        video.write_bytes(b'0123456789')
        self.model = {'version': 'one', 'duration': 4, 'fps': 30, 'project': str(root), 'video': str(video), 'originalVideo': 'short.mp4',
                      'words': [], 'timeline': {'speed': 2, 'keeps': [[2, 6, 0], [10, 14, 2]]},
                      'scenes': [{'id': 's01', 'start': 0, 'end': 4, 'layout': 'split', 'visual': 'stat', 'spoken': 'Hello'}]}
        self.done, self.result = threading.Event(), {}
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), review.make_handler(self.model, self.done, self.result))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = 'http://127.0.0.1:%d' % self.server.server_port

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def post(self, data, headers=None):
        return urlopen(Request(self.url + '/api/feedback', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json', **(headers or {})}))

    def test_source_mapping_accounts_for_cuts_and_speed(self):
        self.assertEqual(review.source_time(self.model['timeline'], 1), 4)
        self.assertEqual(review.source_time(self.model['timeline'], 3), 12)
        timeline = {'keeps': [[2, 6, 0]], 'speed': 2, 'inserts': [{'t0': 2, 'dur': 1}]}
        self.assertEqual(review.source_time(timeline, 2.5), 'i0+0.500')
        timeline['pause'] = {'t0': 3, 'dur': 1}
        self.assertEqual(review.source_time(timeline, 3.5), 'p+0.500')
        timeline['outro'] = {'t0': 4, 'dur': 1}
        self.assertEqual(review.source_time(timeline, 4.5), 'o+0.500')

    def test_validation_uses_server_scene_and_rejects_stale_or_invalid_times(self):
        data = {'version': 'one', 'comments': [{'t': 1, 'scene': 'forged', 'note': 'Fix the title'}]}
        clean = review.validated_feedback(data, self.model)
        self.assertEqual(clean['comments'][0]['scene'], 's01')
        self.assertEqual(clean['comments'][0]['source_time'], 4)
        for seconds in [-1, 4, float('nan'), True, '1']:
            data['comments'][0]['t'] = seconds
            with self.assertRaises(ValueError): review.validated_feedback(data, self.model)
        with self.assertRaises(ValueError): review.validated_feedback({'version': 'old'}, self.model)

    def test_page_is_labeled_and_escapes_transcript_markup(self):
        model = copy.deepcopy(self.model)
        model['scenes'][0]['spoken'] = '</script><script>bad()</script>'
        page = review.page_html(model)
        self.assertNotIn('</script><script>bad()', page)
        for expected in ['role="slider"', 'label for="note"', 'role="status"', 'const KEY = "review:" + REVIEW_VERSION;']:
            self.assertIn(expected, page)

    def test_video_seeking_supports_ranges_and_head(self):
        for value, expected in [('bytes=2-5', b'2345'), ('bytes=7-', b'789'), ('bytes=-3', b'789')]:
            response = urlopen(Request(self.url + '/media', headers={'Range': value}))
            self.assertEqual(response.status, 206)
            self.assertEqual(response.read(), expected)
        response = urlopen(Request(self.url + '/media', method='HEAD'))
        self.assertEqual(response.headers['Content-Length'], '10')
        self.assertEqual(response.read(), b'')
        with self.assertRaises(HTTPError) as error: urlopen(Request(self.url + '/media', headers={'Range': 'bytes=50-60'}))
        self.assertEqual(error.exception.code, 416)

    def test_project_files_and_foreign_origins_are_not_served(self):
        for relative in ['/assets/source.mp4', '/.env', '/../LICENSE']:
            with self.assertRaises(HTTPError) as error: urlopen(self.url + relative)
            self.assertEqual(error.exception.code, 404)
        with self.assertRaises(HTTPError) as error: self.post({'version': 'one'}, {'Origin': 'https://another.example'})
        self.assertEqual(error.exception.code, 403)

    def test_sending_notes_archives_feedback_and_duplicate_submission_is_idempotent(self):
        data = {'version': 'one', 'comments': [{'t': 1, 'note': 'Fix the title'}], 'overall': 'Keep the pacing'}
        with patch.object(review.view, 'save_frames', return_value={}):
            self.assertEqual(self.post(data).status, 200)
            first = self.result['file']
            self.assertEqual(self.post(data).status, 200)
        self.assertEqual(self.result['file'], first)
        saved = json.loads(first.with_name('feedback.json').read_text())
        self.assertEqual(saved['comments'][0]['source_time'], 4)
        self.assertFalse(saved['approved'])
        self.assertIn('Output 1.000s', first.read_text())

    def test_approval_keeps_earlier_notes(self):
        with patch.object(review.view, 'save_frames', return_value={}):
            first = review.write_feedback(self.model, review.validated_feedback({'version': 'one', 'comments': [{'t': 0, 'note': 'Earlier note'}]}, self.model))
            second = review.write_feedback(self.model, review.validated_feedback({'version': 'one'}, self.model))
        self.assertNotEqual(first, second)
        self.assertIn('Earlier note', first.read_text())
        self.assertTrue(json.loads(second.with_name('feedback.json').read_text())['approved'])

    def test_last_frame_comment_gets_a_screenshot(self):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=navy:s=160x280:r=30:d=4',
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', self.model['video']], check=True)
        data = review.validated_feedback({'version': 'one', 'comments': [{'t': 3.967, 'note': 'Final frame'}]}, self.model)
        saved = review.write_feedback(self.model, data)
        self.assertEqual(len(list((saved.parent / 'frames').glob('*.jpg'))), 1)
        self.assertIn('Frame:', saved.read_text())

    def test_invalid_json_and_failed_saves_leave_review_open(self):
        with self.assertRaises(HTTPError) as error: urlopen(Request(self.url + '/api/feedback', data=b'{', headers={'Content-Type': 'application/json'}))
        self.assertEqual(error.exception.code, 400)
        with patch.object(review, 'write_feedback', side_effect=OSError('disk full')):
            with self.assertRaises(HTTPError) as error: self.post({'version': 'one'})
        self.assertEqual(error.exception.code, 500)
        self.assertFalse(self.done.is_set())


if __name__ == '__main__': unittest.main()
