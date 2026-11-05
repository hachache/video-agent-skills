# Third-party notices

## Video Agent Skills

This repository is based on [Melvynx/video-agent-skills](https://github.com/Melvynx/video-agent-skills), starting at commit `4774fa4f2601baa822fd513387202c26e4587902`.

The original MIT license and copyright notice remain in [LICENSE](LICENSE). The original 13 skills, render engine, examples and bundled resources retain their existing notices.

## Video Short review page

The file `skills/short-editing/review/vendor/video-short/review_page.py` is copied from [petergyang/video-short](https://github.com/petergyang/video-short/blob/021340078db9965a7e7199d6fa21a5381cfc1557/skills/video-short/scripts/review_page.py), commit `021340078db9965a7e7199d6fa21a5381cfc1557`.

Copyright (c) 2026 Peter Yang. MIT License. The complete notice is included in [the vendored license](skills/short-editing/review/vendor/video-short/LICENSE).

Apart from trailing blank lines, the module is unchanged. Its interface is adapted through `skills/short-editing/review/review.py`; integration code uses the existing render engine's timeline to attach source-time metadata to review notes.

## Art direction and motion components

The optional local motion kit adapts selected public techniques from LottieFiles,
iart.ai, Video Shotcraft and HyperFrames. Exact revisions, modified techniques and
full MIT/Apache license texts are recorded in
[motion/SOURCES.md](skills/short-editing/motion/SOURCES.md). These components do not
require the upstream frameworks, cloud services or subscriptions.

## Scope of integration

The optional production stack is installed from upstream repositories using the
exact commits in [stack.lock.json](skills/video-studio/stack.lock.json). Those
additional skill sources are not vendored in this repository. The installer keeps
their source records and available upstream license texts, adapting only client
metadata. Engine packages and their license terms remain separate from the skills.

This repository combines publicly available sources. It does not import a private course, a private repository, restricted brand assets, or files removed from the current upstream release. Herk Edit Kit and Video Talkcraft are not included.
