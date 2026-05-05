---
id: 010
title: tsc --noEmit interception — rewrite diagnostics into human messages
milestone: week-4
estimate: 3d
depends_on: [005, 007]
blocks: [012, 014]
awaits_adr: []
type: build
---

## Why

This is the launch pitch. When the remote prompt edits remove a `Placeholder`, raw `tsc --noEmit` says "Property 'customer_name' is missing in type '{ ... }'" with a path into a generated `.d.ts`. That's noise. PromptRegistry rewrites the diagnostic into a human message naming the offending prompt, the removed `Placeholder`, the call-site line, and the version-pin escape hatch. The screenshot of this message is the README hero asset.

## Scope

- A wrapper `promptregistry check --tsc` (or a separate `promptregistry tsc` — name during implementation) that:
  - Spawns `tsc --noEmit --pretty false` (JSON-style) under the user's tsconfig.
  - Filters diagnostics whose source file is a generated `.d.ts` under the configured outDir.
  - For each filtered diagnostic, looks up the originating call-site, the `Pin`, and the diff between the lockfile-recorded `Placeholder` set and the current manifest.
  - Emits a rewritten message: e.g. `Remote prompt 'customer-onboarding@v3' removed variable 'customer_name' — update your call site at src/onboarding.ts:42 or pin to '@v2'.`
  - Passes through unrelated diagnostics unchanged.
- Exit code mirrors raw `tsc` (non-zero on any diagnostic).

## Acceptance criteria

- Vitest covers: removed-placeholder, added-required-placeholder, type-mismatch, unrelated-tsc-error pass-through.
- One end-to-end fixture proves the rewritten message is byte-stable for the README screenshot.
- The rewriting layer is pure: same inputs → same output, no clock or env reads.

## Out of scope

- LSP integration / IDE inline display — CLI-only in v1.
- Auto-fix suggestions beyond "pin to @vX".

## Notes

The exact wording of the rewritten message must be the same string used in the README screenshot (issue 014). Any change here is a coordinated change in both. Treat the message format as load-bearing.
