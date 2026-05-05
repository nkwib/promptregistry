---
id: 004
title: Codegen — emit .d.ts per pulled prompt with manifest hash header
milestone: week-2
estimate: 2d
depends_on: [003]
blocks: [005, 010]
awaits_adr: []
type: build
---

## Why

Without a generated `.d.ts` per prompt, `pull('customer-summary@v3')` returns `Compiled template` typed by the inferred placeholders only at the literal-type level — but downstream `tsc --noEmit` interception (issue 010) needs a stable typed surface to attach diagnostics to. The manifest hash in the header is what lets `promptregistry check` (issue 007) tell stale codegen apart from a stale lockfile.

## Scope

- A codegen step that, for each prompt entry in the local `Manifest`, writes a `.d.ts` under a configurable output dir (default: `./prompts/.generated/<name>.d.ts`).
- The `.d.ts` declares the `Compiled template` type with the literal `Placeholder` set baked in.
- The `.d.ts` carries a header comment with: manifest URL, version `Pin`, content hash (sha256), generation timestamp.
- Re-running codegen on an unchanged manifest produces byte-identical output (no timestamps in body, no map ordering drift).

## Acceptance criteria

- Vitest snapshot of generated `.d.ts` for a known fixture manifest.
- Re-run determinism test: run codegen twice, diff outputs, assert empty.
- Header parser exists (private utility) so `promptregistry check` can read the embedded hash.

## Out of scope

- The `registry.ts` barrel — see issue 005.
- Watching the manifest for changes — manual re-run only in v1.

## Notes

The hash in the header is the same hash format produced in issue 001. The check command (007) reads this header rather than recomputing — that's how stale-codegen surfaces as a hash mismatch instead of a silent compile success.
