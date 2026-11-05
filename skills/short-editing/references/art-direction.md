# Art direction and reusable motion

Use this before planning a new short when the request concerns the look, rhythm,
typography or visual storytelling. For an existing approved draft, preserve its
direction unless the creator asks to change it.

## Choose from the message

Write a short direction brief in `source/direction-brief.md`: the audience, one
takeaway, what the viewer should feel, the visual evidence available, and the
sequence hook → explanation → proof → payoff. A 15-second short may only need three
shots. A useful hold is better than another decorative transition.

Pick a direction from the subject and available assets. The creator's explicit
brand, chosen references and instructions take precedence over preset defaults.

| Direction | Best fit | Visual grammar | Rhythm |
|---|---|---|---|
| `paper` | The original explainer look | Tactile light stage, Inter, one blue accent | Calm, compact reveals |
| `documentary` | A story, explanation, evidence | Slate, editorial serif, red annotation, visible sources | Sentence-led; time to read a proof |
| `kinetic` | A concise claim, energetic announcement | Cobalt stage, large Archivo type, clipped word reveals | Phrase-led; short attacks and clear holds |
| `studio` | A product or interface demonstration | Soft violet planes, Bricolage type, measured depth | Assemble, demonstrate, resolve |

These are starting points, not four mandatory templates. `motion/directions.json`
owns the preset tokens. `source/style.json` owns the project's resolved appearance;
the spec still wins. Do not mix multiple motion vocabularies inside one short
unless the story gives the change a clear reason.

```sh
node <skill>/engine/short.mjs direct <project> --list
node <skill>/engine/short.mjs direct <project> documentary --brief "Make the evidence easy to read"
```

`direct` updates only this project's style snapshot, keeps creator/account metadata,
archives the previous style in `files/direction-history/`, and saves the brief and
preset in `source/direction.json`. `--keep-brand` preserves the current color and
font fields. Rebuild captured HTML components after a direction change: a video
clip already contains its previous colors and type. Restore a previous snapshot by
copying its `style` object into `source/style.json` and its `direction` object into
`source/direction.json` (remove the latter if the saved value is null).

## Design the sequence

- Make the first frame meaningful. The opening phrase or subject is present while
  supporting words assemble. Choose one focal point per shot.
- Tie movement to meaning: a number grows when its value is explained, a chart
  traces the actual data, a comparison reveals the difference. Respect the voice
  before the music; place only compatible visual accents on musical beats.
- Actual footage, screen recordings and photographs are valid evidence. Reframe,
  annotate or move through them when useful. Do not rebuild an authentic screenshot
  merely to satisfy a template, or fabricate a real interface's data.
- Use a consistent type scale and one emphasis role. Restrained gradients, depth,
  overshoot or hard cuts are choices of the selected direction, not universal bans.
- For narration, begin with the original pace. Tighten distracting gaps while
  keeping breaths and pauses that support a point. Speeding every take to 1.15x
  is a Paper convention, not a quality requirement.
- If music exists, locate its phrases and major hits. Use them as candidate edit
  points, never as a reason to cut off a sentence or flash every beat.

## Build a component

The bundled motion kit is local and uses the existing capture engine. It supplies
five components, all with frame-exact random access:

| Component | Use |
|---|---|
| `title-reveal` | A lead phrase recedes as supporting lines assemble |
| `word-relay` | Sequential phrases revealed with a clip wipe |
| `proof-chart` | A traced chart and interpolated value, with a visible source |
| `compare` | A deliberate before/after reveal |
| `showcase` | A title, phrase relay and proof using the same content |

Write only the content that differs in `source/hook.json`:

```json
{
  "duration": 3.6,
  "eyebrow": "THE QUESTION",
  "title": ["One idea.", "Clearly told."],
  "subtitle": "Use a real supporting fact here.",
  "footer": "THE SUBJECT OF THIS SHORT"
}
```

```sh
node <skill>/engine/short.mjs motion <project> title-reveal --config source/hook.json --out source/hook.html
node <skill>/engine/short.mjs capture <project> source/hook.html --dur 3.6 --size 1080x1920
```

The generator prints the capture size and duration. It copies only the two needed
font files into the project's `assets/motion-fonts/`. Generated HTML has no remote
dependencies. It follows the saved direction; without one, it starts with
Documentary. An explicit `--direction kinetic` uses that preset's palette instead
of the saved style, useful when comparing directions. Existing pages are protected
unless `--replace` is supplied.

Useful content fields: `title` (1–3 lines), `phrases` (1–6), `eyebrow`, `subtitle`,
`footer`, `width`, `height`, `duration`. For a chart: `metric`, `values`, `unit`,
`labels` (two axis labels), `source`. For a comparison: `before`, `after`.
`transparent: true` plus capture's `--alpha` exports an overlay. Do not use the
default chart's illustrative data as a fact in a finished video.

Each page has a `.motion.json` sidecar with content, duration, frame size and event
times. Event times are LOCAL to that component; add its start in SHORT time, then
map back to SOURCE time before inserting it into the main spec. Use the existing
`media` and overlay/actor workflow in `scene-library.md`.

## Check the result

Look at the opening frame, each completed beat, each transition and the final
frame. Read text at phone size, verify accents and numbers, and keep captions and
the face unobstructed. Check movement as well as stills: no baseline drift, clipped
words, font flashes or unmotivated motion. Revisit the weakest shot before adding
more effects. Use frame review for the creator's changes.

Implementation sources and licenses: [motion/SOURCES.md](../motion/SOURCES.md).
