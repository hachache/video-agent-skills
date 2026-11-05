---
name: video-studio
description: Coordinate polished shorts, explainers and product videos with the installed Remotion, HyperFrames, Shotcraft, GSAP and motion-design skills. Use for ambitious motion graphics, animated typography, cinematic product demos, storyboard-to-video work or choosing a video workflow. Continue an existing project's engine; use short-editing for recorded talking-head edits and frame review.
---

# Video studio

Select a coherent production route and complete the requested work. Preserve the
creator's existing approval and autonomy choices. Installation or a rendering test
does not authorize posting a video, buying assets or starting a paid generation.

## Find the project and choose the route

Continue before creating. Look for an existing `source/spec.js` (short-editing),
`remotion.config.*` / Remotion compositions, or `index.html` with HyperFrames
composition attributes. Keep its engine, assets and review history. An explicitly
requested engine wins over a default.

| Request | Primary route | Supporting skills |
|---|---|---|
| A real talking-head take, podcast clip, captions, edits to a rendered draft | `short-editing` | `studio-script`, `broll`, its frame review workflow |
| A product film or a named Shotcraft effect | `video-shotcraft` + `remotion-best-practices` | `motion-art-direction`, `shot-composition`, `beat-sync-editing` |
| An HTML explainer, data story, infographic or custom motion overlay | `hyperframes`, then `hyperframes-cli` and `hyperframes-registry` | `gsap-core`, `gsap-timeline`, `media-use` |
| Timing, transitions, kinetic type, composition or color polish | The existing project's route | `motion-design`, `animation-principles`, `color-motion`, the relevant GSAP skill |
| A collaborative concept/storyboard process explicitly requested by the creator | `remotion-video` | `remotion-best-practices` |

For a new ambitious product film, prefer the Shotcraft/Remotion route with real
assets and tuned shots. For a new explanatory motion piece, prefer HyperFrames
and its editable registry. This is a routing preference, not a claim that one
engine always produces better pictures.

Load the owning skill from its sibling folder. Read only references relevant to
the current shot. Avoid loading every installed skill into one context. For
production decisions and the checks that matter, read
[production.md](references/production.md).

## Check the toolkit

The optional stack adds 18 upstream skills at pinned source revisions:

```sh
python3 <video-studio-skill>/scripts/install_stack.py --check
```

If missing, the same command without `--check` installs through the system skill
installer. It needs Python with PyYAML and network access. Existing unmanaged or
modified skills are preserved for review. `stack.lock.json` records repositories,
paths and exact commits. The installer adapts client metadata, keeps original
instructions and licenses, and preserves upstream explicit-only invocation.

These are skills, not engine packages. A Remotion project still needs its declared
npm dependencies; a HyperFrames project needs a compatible CLI. Inspect an
existing `package.json` and lock file before installing. Keep all `@remotion/*`
versions equal. Use a project's pinned binaries rather than fetching a moving
latest version on every command. A machine-local `runtime.json`, when present,
records an already verified toolchain and can be used to locate its binaries;
it does not replace the project's dependency manifest.

The tested versions and the limits of that verification are recorded in
[verification.md](references/verification.md).

Use Three.js / `@remotion/three` when real 3D improves the shot. Drive it with the
video frame and use the renderer's documented GL mode. Blender integration is a
separate setup when sculpting, simulation or Blender-specific work is needed.

## What this stack is based on

[reddit-findings.md](references/reddit-findings.md) distinguishes detailed user
workflows, creator demos and promotional lists, and links back to the discussions.
Reddit is discovery evidence; verify APIs, dependencies and licenses against the
upstream repositories and official documentation. Do not present a post's
rendering-speed or cost claim as a local measurement.
