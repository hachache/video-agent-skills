---
name: editing
description: Entry point for video work. Continue the existing project or route to video-studio for ambitious motion graphics and product films, short-editing for recorded shorts and draft review, or the relevant setup, script, B-roll, clip, translation, image or publishing skill. Use for editing, montage, shorts, reels, videos, scripts, audits or choosing a video workflow.
metadata:
  argument-hint: '[take | url | slug | path] [brief]'
---

# Editing

Route the request to the one skill that owns it, then do the work with that skill. Never edit with your own method: every rule lives in the target skill.

1. Continue before you start. If this conversation already works on a video (a `video-agent/edits/<slug>/` folder, a take just edited, a week of scripts just written), the request is the next step of that project with the skill already in use: apply the change, rerun the step, keep its files, never start it over.
2. Otherwise read the request and pick the skill:
   - An existing draft to watch, approve, comment on, or revise frame by frame: `short-editing`, its frame review workflow. Continue the existing project and preserve its review history.
   - A new ambitious product film, cinematic motion graphics, a Remotion/HyperFrames project, or a choice between video workflows: `video-studio`. It selects the owning engine and the relevant installed skills. Keep an existing project's engine.
   - Art direction, animated typography, visual rhythm, or a Documentary/Kinetic/Studio look: `short-editing`, its `references/art-direction.md`. Work in the existing project; use `direct` and `motion` for local presets and reusable components.
   - No `video-agent/` folder yet, first time, tools, voice, permissions, accounts, keys: `studio-setup`. An edit asked before any setup: run `studio-setup` first (or at least its tools step).
   - Their Instagram stats, "what works on my account", an audit of an account or of their competitors: `insta-audit`.
   - Scripts, ideas for the week, hooks, rewrite, humanize a text, "sounds like AI", what goes viral in their niche, swipe file: `studio-script` (`viral` for the niche research).
   - Instagram reels that blew up for their competitors or for one account, turned into 5 remake scripts ("outliers", "what works for my competitors", "videos to remake", "ideas from @someone"): `outliers`.
   - A take or a local file, "my last take", a video URL to edit, an existing slug, short, reel, a full YouTube video: `short-editing`. "In the style of <name>" = `short-editing ... style <name>`.
   - Their B-roll ("add these clips", "my B-roll", "put my B-roll on this short", find a shot, drop a clip): `broll` (`setup`, `add`, `use`, `search`, `reject`).
   - Their own look (brand color, paper, font, captions, sound, Instagram CTA, tool logos, logo, end card, "change my style"): `studio-setup style`.
   - Copy another creator's editing style ("steal", "edit like @x", a reel given as the model for a look rather than as the take to edit): `steal`.
   - One long video (a podcast, a live, a long YouTube video) into several shorts: `clips`.
   - A version of a take in another language: `short-translate`.
   - Thumbnails, covers, stills, any image: `codex-images`.
   - A photo into a paper-collage animation (Vox style, "anime cette photo"), or a change to one already made: `vox`.
   - Publish or schedule a finished video ("post it", "publier", "mets-le en ligne"): `publish`.
   - Still ambiguous: ask one question only.
3. Load the target: invoke it with the Skill tool, else read `<skills folder>/<skill>/SKILL.md` (the skills installed next to this one) and follow it exactly as if the user had typed `/<skill> <args>`. Pass their words through as that skill's arguments.

Say in one line which skill you picked, then hand over to it. Its own end state is yours.
