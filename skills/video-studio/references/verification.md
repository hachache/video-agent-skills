# Verification record

Checked 5 November 2026 on macOS, Node 24.1.0, Python 3.9.6, FFmpeg and local Chrome.

- All 18 selected upstream skills installed at the commits in `stack.lock.json`
  and passed the skill metadata validator. Their stored source/file receipts
  passed an offline integrity check.
- The repository suite passed 27 tests: existing timeline/review tests, motion
  rendering checks and six new installer tests. The latter cover client metadata,
  explicit invocation, repeated installation, local edits, invalid source files,
  failed-copy cleanup and pinned/contained source paths.
- The local toolchain installed Remotion 4.0.541, HyperFrames 0.9.16, GSAP 3.14.2,
  Three.js 0.187.0 and React Three Fiber 9.8.2. Remotion's version check reported
  matching versions for every installed `@remotion/*` package.
- The actual Shotcraft `Basic3DScene` demo rendered as H.264, 1920×1080, 30 fps,
  7.5 seconds. It uses the source card's fixtures and motion design, not a rewritten
  approximation. A decoded frame was inspected.
- A Three.js mesh animated through `@remotion/three` rendered locally with ANGLE.
  A rendered still was inspected and the 2-second video exported at 1920×1080,
  30 fps.
- A project scaffolded by HyperFrames rendered a local GSAP composition, using
  local script/font files, as H.264, 1920×1080, 30 fps, 3 seconds. The output was
  decoded and inspected.

These checks establish installation and representative rendering compatibility.
They do not benchmark every effect, certify all library shots, test the Shotcraft
workbench or prove that one model/engine consistently produces better films.
No paid generation, cloud rendering, social publishing or Blender server was used.
