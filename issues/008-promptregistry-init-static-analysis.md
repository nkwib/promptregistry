---
id: 008
title: promptregistry init — scaffold manifest from existing prompt() call-sites
milestone: week-3
estimate: 2d
depends_on: [002]
blocks: [011]
awaits_adr: []
type: build
---

## Why

Addy's onboarding-steepness concern: three steps before first value (manifest authoring, codegen wiring, check command) loses readers. `promptregistry init` collapses the first step by static-analysing existing promptkit `prompt()` call-sites in the repo and emitting a starter `Manifest` JSON. Zero manual JSON authoring is the entry point.

## Scope

- CLI subcommand `promptregistry init [--src ./src]` that:
  - Parses TS files under `--src` with the TypeScript compiler API (or ts-morph if added as a dev dep).
  - Finds every tagged-template invocation `prompt`...`` (default and `single-brace` forms).
  - Extracts the source segments and emits one manifest entry per call-site, naming the prompt from the variable / export name where assigned, fallback to a deterministic slug.
  - Writes `manifest.json` and a starter `prompt-lock.json` referencing it as a local file URL.
- Idempotent: running again on an unchanged repo produces a byte-identical manifest.
- Loud failure when the same prompt name is inferred twice (forces user to disambiguate).

## Acceptance criteria

- Vitest covers single-prompt, multi-prompt, and name-collision fixtures.
- Inferred manifest validates against issue 002's schema without manual edits.
- A README walkthrough fixture exists: clone repo → run `init` → run codegen → `pull(...)` works in under 60s.

## Out of scope

- Updating an existing manifest (init is for greenfield only).
- Detecting `pull()` call-sites that already exist (init runs before pull is wired up).

## Notes

The 60-second zero-to-first-error path is the same DX promise promptkit's `npx promptkit init` makes. PromptRegistry's version is a strictly larger scaffold (manifest + lockfile + codegen output) but must hit the same fluency bar.
