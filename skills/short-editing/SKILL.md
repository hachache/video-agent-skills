---
name: short-editing
description: Edit recordings into finished shorts or YouTube videos with local transcription, cuts, captions, music and a Node + Chrome + FFmpeg render engine. Use for video editing, montage, motion graphics, visual direction, typography, rendering or frame review. Includes Paper, Documentary, Kinetic and Studio directions plus reusable, deterministic motion components. Deliver MP4, subtitles and post copy; preserve the direction and review history of an existing draft.
allowed-tools: Bash(node *) Bash(ffmpeg *) Bash(ffprobe *) Bash(open video-agent/edits/*)
metadata:
  argument-hint: <take file or slug> [9:16 | 1:1 | 16:9] [style <name>] [brief]
---

# Short Editing

For comments on an existing draft, use the [frame review workflow](review/README.md) directly. Run `node <skill>/engine/short.mjs review <project>`, read `files/review/feedback.md`, apply the requested changes in SOURCE time, and render the next version. Draft approval does not authorize publication.

One raw take in, one finished video out: `video-agent/edits/short-<slug>/output/short-<slug>.mp4`.

The engine ships in this skill folder (`<skill>` below): `<skill>/engine/short.mjs`. It is a deterministic canvas renderer driven by `source/spec.js`, with arbitrary frame-driven HTML motion components. Paper is the original look; Documentary, Kinetic and Studio provide other directions. Everything runs on the creator's computer, macOS, Windows or Linux: Node 20+, ffmpeg, a Chrome (or the headless Chromium setup installs), whisper.cpp.

Read before writing a spec:

- [references/shorts-codes.md](references/shorts-codes.md): format, safe zones, hook and pace
- [references/art-direction.md](references/art-direction.md): choose a direction, plan the sequence, build reusable motion components; read for a new video or visual restyling
- [references/design-system.md](references/design-system.md): the original Paper look; its taste rules apply when that direction is selected
- [references/scene-library.md](references/scene-library.md): every scene and item, every parameter, the time keys
- [references/music.md](references/music.md): the 8 beds, which fits which hook, where to start it
- [references/style.md](references/style.md): original Paper conventions; an explicit project direction takes precedence
- [examples/](examples/README.md): real shorts made with this engine (spec, components, contact sheets). Open the one closest to the request before planning: it is the quality bar.

## How to run it

- Talk in the creator's language (`creator.lang` of the style, else `video-agent/voice.md`, else English). Say in one line what each long step does and how long it takes.
- `<slug>`: lowercase, dashes, no dots or spaces.
- Every command runs from the project root (the folder that holds `video-agent/`).
- For a new short, infer a suitable direction from the subject and brief, then save it with `direct` after `init`. Preserve an existing creator choice. Before authoring, record the message, evidence, typography, movement and shot rhythm in `source/direction-brief.md`. Use the generated motion kit when it fits; custom components remain available.

## 0. Setup (first time only, then a 1 s check)

```bash
node <skill>/engine/setup.mjs --check || node <skill>/engine/setup.mjs
```

It installs what is missing: the engine packages (15 MB), a Chromium when no Chrome is installed (100 MB), whisper.cpp and its speech model (0.5 GB, once), the 8 music beds and the icons (generated on this computer). Tell them the first run takes 3 to 6 minutes. ffmpeg missing: it prints the command to install it (`brew install ffmpeg`, `winget install Gyan.FFmpeg`); run it with their ok, then setup again.

## 1. The take

Use the file they name, else the newest file in `video-agent/takes/`. A URL (YouTube, X, Instagram, Loom, a direct mp4): `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "video-agent/takes/<slug>.%(ext)s" "<url>"` first.

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of compact "<take>"
```

No audio stream: stop and say so. Then create the project:

```bash
node <skill>/engine/short.mjs init video-agent/edits/short-<slug> --source "<take>" [--style <name>]
```

For a chosen visual direction, run `node <skill>/engine/short.mjs direct video-agent/edits/short-<slug> documentary` (or `paper`, `kinetic`, `studio`). Add `--keep-brand` when retaining the creator's colors and fonts. This updates only this project's style and archives its previous snapshot. Read [art-direction.md](references/art-direction.md) for motion commands and content fields.

- The style: `style <name>` in the request = `video-agent/styles/<name>/style.json`, passed as `--style <name>` (only when that folder exists: an unknown name stops `init`, so list `video-agent/styles/` instead). Without it, `init` takes the default one (`video-agent/style.json` names it). No style at all: first write `video-agent/styles/default/style.json` = `{"version": 1, "name": "default"}` plus the `style` of the `default` look of `<skill>/assets/looks.json` (system font, camera full width, mono caps captions on a black band), and `video-agent/style.json` = `{"default": "default"}`, then say once that `/studio-setup style` makes it theirs in 2 minutes.
- `init` makes `assets/ files/ source/ output/ stills/`, copies the take to `assets/source.mp4`, frames `cam` on the face, writes the starter `source/spec.js` and snapshots the style into `source/style.json` (engine defaults < style < spec: the spec only sets what differs for this one short). The style's `assets/` (logos, images) are copied into the project.
- Format: `9:16` by default. `1:1` = `format: 'square'` (X feed), `16:9` = `format: 'wide'` in the spec.

## 2. Words

```bash
node <skill>/engine/short.mjs words video-agent/edits/short-<slug> [lang]
```

whisper.cpp on this computer, about real time (a 60 s take, about a minute), free. With an ElevenLabs key (`ELEVENLABS_API_KEY=` or `ELEVEN_KEY=` in `video-agent/.env`, the project `.env` or the environment), ElevenLabs Scribe instead, on its own: it hears every retake and false start that whisper smooths over, and names; a few cents a take. Recommend it once when a take has retakes. Never ask for a key in chat, never print one.

Then `prepare` (step 4) once: it writes `files/words.md`, every word with its SOURCE time and the SHORT time it lands on after the cuts. Fix misheard words from the script with `captions.replace: [['clics cloud', 'skills Claude']]`, never by editing the times.

## 3. The spec

Author `source/spec.js` from `files/words.md`. All times are SOURCE seconds; the engine maps them onto the tightened cut. Start from the starter spec `init` wrote, and from the closest example.

Plan the beats first, in a comment block at the top of the spec:

- **Hook** (first 2 s): readable on the first frame, never blank paper at t=0. It adds to the spoken hook, never repeats it.
- **Pace follows the thought**: change the shot when the message, evidence or emotional beat changes. A 2 to 4 s beat is a useful starting point, not a timer. Let a proof or reaction remain readable. Place a counter, terminal, annotation or motion component on the word it illustrates (`at` = that word's source time).
- **Pick the item from what is said** (all in scene-library): a figure = `counter` (`countFrom`/`countTo`, `strikeAt` when it dies); a command or a prompt = `term` (`typeFrom`, `typeTo`, `out` lines); a folder or a list of parts = `tree`; a tool named = its real `logo`; a result = `check`; a real screen = `screen` (zoom keys + rings on the number they read); a tweet = `tweet`; before / after = two boards or `bars`; the big payoff = `stat` or a board with one huge `text` and an `emph` word.
- **Camera**: `layout.keys: [[t, seam]]`, seam 1160 = split (paper above, camera card below), 1920 = paper alone, 0 = full camera. Full camera only for the direct lines (a story, a reaction, the CTA) and for 5 s or more of SHORT time; a style with a fixed `layout.seam` keeps that one size all along.
- **Every beat has a purpose**: use motion to reveal, compare or explain. Real footage, screen recordings, screenshots and photographs may carry evidence; reframe or annotate them when useful. Recreate a UI only when animation calls for it, and preserve its real data. Use typography as the main subject when that is the selected direction.
- **The hook gets the most work**: communicate the promise on frame zero and create a reason to keep watching. A reversal, an authentic result, a question or a typographic reveal can carry it. Match its density to the direction; add layers only when they help the viewer understand.
- **Motion components**: what the library cannot draw well (a real app in its own UI, an Instagram comment sheet, a notification, a GitHub repo page, a software idea, the hook's mini story, an illustration that acts) becomes an HTML page with `window.setT(t)`, captured into a clip (step 3b). The examples hold a dozen of them to copy.
- **Captions**: on by default, on the seam. `captions.emph` = the words in the accent color, `captions.hide: [[a, b]]` over a board that carries the same words.
- **Music**: one bed from [music.md](references/music.md) picked by the hook's emotion, `music: { bed: '<id>', offset }`. Never the same bed as the previous short.
- **Sound**: voice first, music under it, designed accents on meaningful payoffs. Paper uses few thuds or pops; a kinetic sequence may use a transition sound when motivated. Use bundled files from `assets/sfx/` (see [references/sfx.md](references/sfx.md)); generating additional sound is optional and follows the creator's request.
- **Real logos, always**: every tool or app named on screen shows its real icon in `assets/logos/<name>.png` (the App Store icon, the official site or repo), never a letter glyph, never an emoji, never a look-alike. Download it into the project and say from where.
- No em-dashes in any on-screen text.

### 3b. Motion components

One HTML file per component in `source/<name>.html`, 1080 wide (or the card size), every animation a pure function of `t` set by `window.setT(t)` (no CSS animation, no timers), transparent background for an overlay. See [references/sub-agents.md](references/sub-agents.md) for the page contract and the prompt to give a sub-agent (one per component, in parallel, when the harness has sub-agents; else build them one after the other). Capture:

```bash
node <skill>/engine/short.mjs capture video-agent/edits/short-<slug> source/<name>.html --dur 4.5 --alpha --out assets/<name>.mov
```

Read its `stills/<name>-sheet.jpg`, then wire it: `media: { x: { src: 'assets/<name>.mov', width: 1080, alpha: true } }` plus an `overlay` scene (or an actor on the board), see `examples/thinking-orbs/source/spec.js`.

## 4. Prepare

```bash
node <skill>/engine/short.mjs prepare video-agent/edits/short-<slug>
```

Cuts every micro silence, applies the speed (1.15 by default), splices the voice, extracts the camera and media frames (cached), writes `assets/timeline.json` and `files/words.md`. Rerun it after a change to `cut`, `cam` or `media`. `cut: [[a, b]]` (source time) drops a retake or a false start: walk the script, keep the last complete attempt of each line.

## 5. Stills, then critique (the main loop)

```bash
node <skill>/engine/short.mjs stills video-agent/edits/short-<slug> 0.3 2.9s 6.4s 9s 12.9s
```

Plain numbers = SHORT time, an `s` suffix = SOURCE time. Take one still per beat (the moment it is complete), plus the hook and the last second. Read `stills/contact.jpg`, then zoom the full-size stills, and check the quality bar below. Fix the spec, stills again. Stills cost seconds, renders cost minutes: iterate here.

## 6. Render, sound, final

```bash
node <skill>/engine/short.mjs all video-agent/edits/short-<slug>
```

Render + audio (ducked voice, music bed, SFX, mixed beside the render) + final (mux, poster, QC), all at once. On an Apple Silicon Mac a 36 s short takes about 5 s (the render alone about 4 s, 250 fps, WebCodecs H.264 inside Chrome with 2 workers); slower machines take longer, so run it in the background and say how long. After a sound change, rerun only `audio` and `final`. The QC line must read `h264 1080 1920` (or `1080 1080`, `1920 1080`), a duration equal to the timeline, about -14 LUFS and a true peak at or under -1 dBTP (else `mix: { ceil: -2.2 }` in the spec, then `audio` and `final` again). Draft: `render ... --scale .5`.

## Quality bar (every contact sheet)

- The hook reads on the first frame.
- Every beat advances the message. A still image or a quiet hold can be deliberate; avoid accidental dead time and motion that competes with the subject.
- Every board fills the paper: big mobile text (nothing under 34 px, captions about 84 px), 1 to 3 lines, nothing cut at the edges, nothing in the safe zones of [shorts-codes.md](references/shorts-codes.md).
- Captions never overlap a card, a CTA or a chat composer (`captions.hide`).
- Follow the resolved direction and brand palette. Keep one clear emphasis role; use `captions.emph` and `emph` for meaningful words.
- Cards never change size; the camera card never resizes. A full-camera stretch lasts 5 s or more.
- No ghost of the old beat under the new one, no counter parked on 0, no two values stacked in one slot.
- Camera colors natural: bright warm skin, never grey or greenish (`stills/grade.jpg`).
- Every named tool shows its real logo.
- Sound: the voice on top, the bed breathing between sentences, hits only on real payoffs, no whooshes.

## 7. Deliver

For a review round, run `node <skill>/engine/short.mjs review video-agent/edits/short-<slug>`. The page supports frame stepping, comments, themes and approval. Each reviewed draft and its notes are kept in `files/review/versions/`. Use the saved source times when changing the spec; an inserted segment is identified by `p+`, `iK+` or `o+`. Read [the review guide](review/README.md) before the first round.

In `video-agent/edits/short-<slug>/output/`: `short-<slug>.mp4` and its poster. Then write next to them:

- `short-<slug>.srt`: from `files/words.md` (the SHORT times), up to 7 words per cue, a new cue after each sentence.
- `post.md`: the post copy (below).

Open the video so they watch it right away: `open <mp4>` (macOS), `start "" "<mp4>"` (Windows), `xdg-open <mp4>` (Linux). Say the length, what was cut, the bed and why, and offer one change ("another hook? a board on another word? full camera on the story?"). A change = edit `spec.js`, stills, `all` again. A change they want on every video (accent, font, captions, pace) goes in their style (`video-agent/styles/<name>/style.json`, schema in [style-schema.md](references/style-schema.md)), not only in this spec. Next: `/publish short-<slug>`.


## Post copy

`post.md`, from the script and voice.md, in the language of the video:

- **Title** (YouTube Shorts): under 60 characters, the topic in the first 3 words.
- **Caption**: the first 125 characters work on their own. Then 1 or 2 short lines and one ask (the CTA of the style).
- **Search words**: the 2 or 3 words their viewer would type, written plainly in the title or the first line.
- **Hashtags**: 3 to 5 about the topic. No #fyp or #viral.
- Nothing the video doesn't say.

Run the humanize pass of `studio-script` (its `references/humanize.md`) on it when that skill is installed.

## CapCut or Premiere

Some creators prefer their editor. Do steps 0 to 4 (the spec with no scenes), then give them `files/words.md` (the cut, word by word) and the plain cut: `node <skill>/engine/short.mjs rough video-agent/edits/short-<slug>` writes `output/short-<slug>-rough.mp4` (every silence cut, full frame, no motion design) to import, with the `.srt` of step 7.

## Paper-only (no take)

`silent: true` and `duration: <s>` in the spec, `init` without `--source`, skip step 2. No voice, camera or captions; the music and the on-screen text carry it, same pace rule.

## Honest limits

- whisper.cpp mishears names and jargon: fix them with `captions.replace`, check numbers by eye.
- A cut can clip a breath or a soft last syllable: watch the result once before posting.
- Claude cannot hear the take: it trusts the timings. Bad audio (music, echo, two voices) makes them worse.
- Face framing is exact on macOS (Apple Vision); on Windows and Linux it uses MediaPipe in Chrome, check `cam` on the first still.
- This fork includes the local frame review studio. The original paid kit's recorder, B-roll database app, faceless mascot and thumbnail tooling are not included.
