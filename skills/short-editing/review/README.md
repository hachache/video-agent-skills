# Frame review

The existing render engine now opens a local review page derived from Peter Yang's [Video Short](https://github.com/petergyang/video-short). It uses the current edit and timeline; no second renderer, cloud account or transcription service is required for review.

## Open a finished draft

From your project folder, replace `<skill>` with the installed `short-editing` directory:

```sh
node <skill>/engine/short.mjs all video-agent/edits/short-demo
node <skill>/engine/short.mjs review video-agent/edits/short-demo
```

Python 3.9+ and FFmpeg/FFprobe must be on the PATH. `PYTHON` can select the Python executable. The page runs on localhost and stops after feedback is sent or after two hours.

- Pause on a frame, type a comment, and press Enter.
- Left and right step one frame; Shift plus an arrow steps one second.
- Use the timeline, playback-speed selector, and light/dark toggle to inspect the edit.
- Send the notes, or use **Looks good** to approve a draft without notes.
- Read `files/review/feedback.md` and `feedback.json` before editing again.

Every comment includes the output time and its corresponding source time. The source time accounts for cuts and playback speed. A comment inside an inserted pause, clip or outro uses the engine's `p+`, `iK+` or `o+` notation; it does not point at an unrelated source frame.

The page snapshots each reviewed video and spec into `files/review/versions/<version>/`. Notes and comment screenshots are archived under that version. Reopening the page never removes previous feedback. Browser drafts are keyed by the video version, so notes on one draft cannot silently attach to another one.

Approval concerns the reviewed draft. Publishing remains a separate request through the existing publishing skill.

## Options

```sh
node <skill>/engine/short.mjs review PROJECT --video output/custom.mp4
node <skill>/engine/short.mjs review PROJECT --no-open --port 8791 --timeout 3600
node <skill>/engine/short.mjs review PROJECT --export
```

`--export` writes the versioned review model and video snapshot without starting a server. An occupied port falls back to an available one and prints its URL. `--no-open` always prevents opening a browser. A missing, outdated or mismatched render gives a corrective error instead of collecting feedback on the wrong edit.

Only the page, its video and its feedback endpoints are served. The project directory and its raw recordings are not exposed as a file browser.

## Reuse and maintenance

The upstream review module is preserved in `vendor/video-short/` with its MIT license. `review.py` adapts its page for this engine, including source-time notes, version isolation, keyboard labels, visible focus, mobile layout and bounded media serving. See the repository's `THIRD_PARTY_NOTICES.md` for pinned sources.
