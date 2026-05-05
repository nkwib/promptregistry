---
id: 015
title: npm publish + repo description + package.json metadata
milestone: week-5
estimate: 0.5d
depends_on: [012, 013]
blocks: [016]
awaits_adr: []
type: launch
---

## Why

promptkit's launch insight (per the synthesis) was wiring the TS Playground link into `package.json#homepage` AND the GitHub repo description so `npm info` and search both surface the demo. PromptRegistry's analog: the hero screenshot URL goes in `homepage`, the one-liner names the wedge in the GitHub repo description, and discovery doesn't depend on the README being read.

## Scope

- `package.json` populated with: `name`, `version`, `description` (matches GitHub repo description verbatim), `homepage` (link to the README hero anchor), `repository`, `keywords`, `license` (MIT or Apache-2.0 — pick during issue), `bin`, `exports`, `engines.node >= 20`, `sideEffects: false`.
- ESM source / dual-publish (mirror promptkit ADR-0003 — same invariants apply).
- GitHub repo description set, repo topics tagged.
- `npm publish --dry-run` clean (no extraneous files, no missing `files` entries).

## Acceptance criteria

- `npm info promptregistry` shows the description and homepage exactly as on GitHub.
- `pnpm pack && tar -tf` enumerates only intended files.
- A fresh `pnpm add promptregistry` in a sibling project resolves and exposes the bin.

## Out of scope

- npm provenance / sigstore (v2).
- Pre-release / canary channels.

## Notes

License decision is fast but binary; do not bikeshed in the body, decide in the implementation. The promptkit project will likely set the precedent — match it.
