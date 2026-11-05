---
version: alpha
name: Video Agent Skills Review
description: A local video review desk with frame-linked notes and an unobstructed player.
colors:
  primary: '#e0a800'
  background: '#171614'
  surface: '#262420'
  text: '#eae7e0'
  border: '#34322d'
  danger: '#d9705f'
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, sans-serif'
  timecode:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
rounded:
  DEFAULT: '8px'
  control: '6px'
  video: '10px'
spacing:
  sidebar: '352px'
  stage-x: '28px'
  stage-y: '20px'
components:
  player:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.video}'
  notes:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.DEFAULT}'
  commentPin:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.background}'
---

# Video review desk

## Overview

The product is a local review tool for creators checking a rendered short. Preserve the established Video Short review interface rather than introducing a new visual identity. The signature is the shared scene timeline: the video, pinned comments and exact timecode refer to the same draft. The initial interface is English; scripts and video content keep the creator's language.

Runtime CSS is canonical (ownership model B). The vendored module's `CSS` supplies the accepted palette and basic layout; `review.py:EXTRA_CSS` owns integration adjustments. These values are mirrored here, not generated into a second stylesheet. `colors.primary` maps to `--pin`, background to `--canvas`, surface to `--card`, text to `--txt`, border to `--card-border`, and danger to `--danger`.

## Colors

Use tonal panels and thin borders so the rendered video dominates. Amber marks comments and keyboard focus. The existing light theme uses the same semantic CSS variables; text contrast is adjusted in the integration stylesheet. Forced colors may use system scrollbars and focus colors.

## Typography

Keep the system sans-serif for controls and notes, and monospace for timecodes. Do not download fonts for the review interface. Text in the video is controlled by the creator's style, independently of this page.

## Layout

Desktop: a flexible video stage and a 352 px notes rail. Below 700 px, stack the stage above the notes rail; constrain the video's height so comments and the submission action remain reachable. Each surface owns its scrolling. The player keeps its aspect ratio and controls do not move while feedback is being saved.

## Elevation & Depth

Use the existing borders and restrained composition-card shadow. Avoid decorative surfaces around the video. The keyboard-help popover is the only floating utility.

## Shapes

Cards use an 8 px radius, ordinary controls 6 px, and the player 10 px. Timeline pins remain circular to distinguish them from scene bands.

## Components

The canonical owners are `page_html` for labels and markup adaptation, `EXTRA_CSS` for accessibility and responsive overrides, and the vendored page for playback and note composition. The native speed select deliberately accepts platform-owned popup geometry.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | `review.py:page_html` and the shared note composer | `skills/short-editing/review/README.md` | Frame comment and overall note | `tests/test_review.py` and browser review round |
| Select/Listbox | Native playback-speed select in the vendored page | This document's native popup decision | Playback speeds from 0.25x to 2x | Keyboard and narrow-viewport browser check |
| Scrollbar | `review.py:EXTRA_CSS` | This document and runtime CSS | Light, dark and forced colors | Browser layout and theme checks |

Use visible keyboard focus, persistent labels on note fields, an ARIA live region for submission status, and an accessible timeline with arrow/Home/End navigation. Delete and jump actions remain visible without hovering. Pointer and keyboard actions target the same frames. Preserve unsent notes after a failed submission. Successful submission clears only that version's local draft; archived notes stay on disk. Respect IME composition and reduced motion. Styling a new scroll region must inherit the document scrollbar baseline.

## Do's and Don'ts

- Keep the video itself unobstructed and retain precise frame stepping.
- Use the same labels for the same action throughout a review round.
- Keep comments attached to the immutable draft they describe.
- Avoid browser dialogs, remote font loads, and background media uploads.
