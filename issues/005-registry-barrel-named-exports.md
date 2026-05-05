---
id: 005
title: Codegen — typed registry.ts barrel with named exports per prompt
milestone: week-2
estimate: 1d
depends_on: [004]
blocks: [010]
type: build

## Why

Matt + Theo + Rauch convergence: `pull('customer-summary@v3')` as a string-keyed call is greppable for one regex and refactor-hostile under rename. A typed `registry.ts` barrel re-exporting each prompt as a named export (`export { customerSummary } from './prompts/customer-summary'`) is the ship-bearing API surface — it makes the tooling feel TypeScript-native rather than a runtime registry. See ADR-0004.

## Scope

- Codegen extends issue 004's output with a single `registry.ts` (runtime barrel, not `.d.ts` only) at the output dir root.
- One named export per prompt entry, identifier-cased from the `name` (kebab → camel).
- Each export references the per-prompt `.d.ts` so jump-to-definition lands on the typed `Compiled template`.
- Collision handling: two prompts whose names normalise to the same identifier fail loudly with both raw names quoted.

## Acceptance criteria

- Vitest snapshot of `registry.ts` for a multi-prompt fixture manifest.
- Identifier collision test produces a deterministic failure message.
- A user can `import { customerSummary } from './prompts/.generated/registry'` in a TS file and the inferred `Variables object` matches the manifest entry's placeholders.

## Out of scope

- Auto-imports / IDE plumbing.
- Sub-namespacing prompts by folder.

## Notes

Resolved by ADR-0004: the barrel is the exclusive public surface. No `pull()` export from the package.
