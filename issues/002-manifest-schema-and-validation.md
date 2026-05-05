---
id: 002
title: Manifest schema and runtime validation
milestone: week-1
estimate: 1d
depends_on: [001]
blocks: [003, 005, 008]
awaits_adr: []
type: build
---

## Why

The `Manifest` is the load-bearing wire format between the remote bucket and every CLI subcommand. Before `pull`, codegen, `init`, or `check` can read it, the schema must be locked down with one canonical TypeScript type, runtime validation, and explicit reject behaviour on unknown shapes — otherwise stale-codegen failures are silent for unrelated reasons.

## Scope

- TypeScript type `Manifest` with: a manifest-format-version field, a list of prompt entries, each with `name`, `version` (semver-ish tag), `template` (raw promptkit-compatible source), `delimiter` (object `{ open, close }`, defaulting to `{{`/`}}` per promptkit ADR-0001).
- Runtime validator using Zod (peer-optional, mirroring promptkit) or a hand-rolled guard if Zod absence must be supported in the CLI itself.
- Reject manifests with duplicate `name@version`, unknown top-level keys, or missing required fields with a specific error code.

## Acceptance criteria

- Vitest covers each rejection case with a named error code.
- Type and runtime validator are derived from a single source of truth (no drift).
- A manifest written by `promptregistry init` (issue 008) round-trips through the validator unchanged.

## Out of scope

- Migration importers from Langfuse / PromptLayer.
- Multi-file manifest support — single JSON file only.

## Notes

The `delimiter` field exists so a remote prompt authored with a non-default delimiter still reflects correctly into the generated `.d.ts`. This must agree with promptkit's parser ADR-0002.
