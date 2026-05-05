---
id: 014
title: Screenshot pipeline — rewritten-tsc and manifest-diff hero assets
milestone: week-5
estimate: 1d
depends_on: [010, 011]
blocks: [012, 016]
awaits_adr: []
type: docs
---

## Why

The README hero is two screenshots. They must be reproducible (so a future change to the diagnostic message doesn't leave a stale image), high-DPI (so they render on GitHub at retina without aliasing), and committed as actual assets — not external links that break.

## Scope

- A `scripts/screenshot.ts` (or shell script) that:
  - Runs the end-to-end fixture from issue 011 with a deliberate manifest edit.
  - Captures the rewritten `promptregistry check --tsc` output to a terminal renderer (e.g. `silicon`, `freeze`, or a hand-rolled SVG).
  - Captures the manifest diff side-by-side via the same renderer.
- Output committed as PNG (for npm) and SVG (for GitHub) under `docs/`.
- Re-running the script regenerates the assets byte-stably modulo OS-level font diffs — document the canonical command.

## Acceptance criteria

- Both assets exist and the README references them.
- Re-running the script with no upstream changes produces the same SVG output (PNG may diff on font hinting only).
- Asset file size < 100KB each.

## Out of scope

- Animated GIFs / videos.
- Auto-regeneration on every CI run.

## Notes

If the rewritten message in issue 010 changes wording, this issue's script must rerun and the hero screenshots must be re-committed. Owners of issue 010 must know this coupling.
