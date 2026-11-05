# Motion sources

Only selected public techniques are adapted. The renderer, project integration,
presets and frame-driven DOM components live in this repository. No hosted service,
remote font request, GSAP runtime or Remotion runtime is needed by these components.

| Source | Revision | What is used | License |
|---|---|---|---|
| [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill/tree/f9a8a041b85185ee4881b3471d3415e939aac772) | `f9a8a041b85185ee4881b3471d3415e939aac772` | Motion personality, primary/support hierarchy and stagger budgets, adapted to video timing | [MIT](licenses/lottiefiles-MIT.txt) |
| [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills/tree/3c129f769d90a1328c209c386492333c9ac62312) | `3c129f769d90a1328c209c386492333c9ac62312` | Art-direction brief, framing and phrase-based rhythm from `motion-art-direction`, `shot-composition`, `beat-sync-editing` | [MIT](licenses/iart-MIT.txt) |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft/tree/1266a3ec4831289c4d893d42dd5102723658039a) | `1266a3ec4831289c4d893d42dd5102723658039a` | `lead-word-zoom-assemble` shot: a present lead phrase recedes while the following lines assemble | [Apache 2.0](licenses/shotcraft-Apache-2.0.txt) |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes/tree/b7d72c9478bf0717458ced2d8ab35b5807b45f3c) | `b7d72c9478bf0717458ced2d8ab35b5807b45f3c` | `registry/components/caption-clip-wipe/caption-clip-wipe.html`: clip-path text reveals, adapted to phrase-level deterministic seeking | [Apache 2.0](licenses/hyperframes-Apache-2.0.txt) |

The Shotcraft technique is reimplemented with DOM transforms, multiline fitting,
project-local fonts and direction-specific layouts. The HyperFrames technique is
reimplemented without GSAP, remote fonts, sample captions or its timing contract.
Both are driven by `window.setT(seconds)` for the existing capture engine.
Examples and chart values are illustrative, not performance claims or user data.

Copyright notices and full license texts are retained in `licenses/`. Upstream
brand assets, sound samples and the noncommercial Video Talkcraft package are not
included.
