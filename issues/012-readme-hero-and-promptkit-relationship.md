---
id: 012
title: README hero — rewritten tsc screenshot + PM-edits-manifest before/after
milestone: week-5
estimate: 2d
depends_on: [010, 011]
blocks: [015, 016]
awaits_adr: []
type: docs
---

## Why

Theo + Rauch convergence: the launch story is the CI failure screenshot, not the API. The README's first screen must show the rewritten `tsc` diagnostic and a side-by-side: "PM edited the manifest" → "engineer's build error."  This is the hero asset; everything else is supporting prose.

## Scope

- A README first paragraph that:
  - Names the wedge (typed `pull` + lockfile-gated `Placeholder` integrity).
  - Points at promptkit's `CONTEXT.md` for the foundational vocabulary (Placeholder, Variables object, Compiled template, Parser) — does NOT re-explain those terms.
  - Embeds two screenshots: the rewritten `tsc` error, and the side-by-side manifest diff + error.
- A "Relationship to promptkit" subsection: one paragraph, links to the `CONTEXT.md` and the three promptkit ADRs (default delimiter, pluggable parser, ESM/CJS interop).
- A non-goal line in paragraph one mirroring promptkit's pattern: this library is variables + lockfile integrity only; no hosted UI, no eval running, no migration tooling.

## Acceptance criteria

- README renders cleanly on GitHub and on npm package page.
- Screenshot SVG / PNG is checked in under `docs/` and referenced via relative paths.
- A reader scrolling past the hero in 10 seconds can name the wedge.

## Out of scope

- A separate docs site (defer to v2 if needed).
- API reference docs — that's issue 013.

## Notes

The screenshots are byte-coupled with issue 010's message format. Treat any update to the diagnostic wording as a doc change too.
