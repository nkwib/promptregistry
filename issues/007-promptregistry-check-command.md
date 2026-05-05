---
id: 007
title: promptregistry check — cross-check generated barrel, manifest, lockfile, remote
milestone: week-3
estimate: 3d
depends_on: [004, 006]
blocks: [010]
type: build

## Why

`promptregistry check` is the stale-codegen firewall. Without it, a teammate edits the remote prompt, forgets to re-run codegen, the generated header hash diverges from the lockfile, and `tsc` happily compiles against the old types.

The original draft of this ticket assumed user code called `pull('name@v3')` directly and that `check` would walk those string-keyed call-sites. ADR-0004 closed that path: the public surface is named imports from the generated `registry.ts` barrel, not `pull()`. Codegen also no longer emits `.d.ts` declarations — it emits runtime `.ts` files whose header carries the `Pin` and content hash. The four failure modes are now expressed against the generated module set, not against `pull()` call-sites.

Four failure modes must be detected loudly:
1. **Hash drift** — lockfile hash ≠ live remote manifest hash (remote was edited without a version bump).
2. **Stale generated file** — generated `<name>.ts` header hash ≠ lockfile hash (codegen wasn't re-run after a manifest update).
3. **Missing pin** — a generated file exists for a `Pin` that has no lockfile entry (lockfile was hand-edited, or codegen ran against a different manifest).
4. **Orphaned entry** — a lockfile entry has no corresponding generated file (manifest entry deleted but lockfile not regenerated). Surfaced as a warning, not an error.

See ADR-0005 and ADR-0006.

## Scope

- CLI subcommand `promptregistry check` that:
  - Loads the local `Manifest` (or fetches it from `manifestUrl`), `prompt-lock.json`, and parses every generated `<name>.ts` header in `outDir` (excluding `registry.ts`).
  - Asserts: lockfile hash equals the current manifest hash; every generated file's header hash equals the lockfile hash; every generated file's `Pin` has a lockfile entry.
  - Reports orphaned lockfile entries as warnings.
  - One network fetch per unique `manifestUrl`.
  - Exits non-zero with a categorised error per failure kind. Pass-through `--tsc` triggers issue 010's diagnostic rewriter after the basic checks.

## Acceptance criteria

- Vitest covers each of the four failure modes plus the all-green case (`tests/check.test.ts`).
- Single-command run on a known-good fixture is < 2s without network, < 5s with.
- Errors carry a stable `code` field (`hash-drift`, `stale-dts`, `missing-pin`, `manifest-fetch-failed`, `missing-lockfile`) and a human-readable message.
- Drift in the registry barrel itself (a stale named export referencing a deleted prompt) is caught indirectly: the orphaned-entry warning fires when the lockfile holds a Pin that no longer has a generated file.

## Out of scope

- Walking user source files for direct `pull()` invocations — `pull()` is internal-only post-ADR-0004 and consumers don't reference it. If a future API ever ships a string-keyed registry lookup, that's a new check.
- The `tsc --noEmit` rewrite — that is issue 010 and runs after `check` passes.
- Auto-fix flag — fail loudly only.

## Notes

Resolved by ADR-0006: recommended placement is `package.json` build-script integration (`"typecheck": "promptregistry check && tsc --noEmit"`) plus a CI snippet. No pre-commit hook.

Implementation: `src/check/index.ts`. The four failure modes map to exit-code-bearing entries in `result.errors`; the orphaned-entry case maps to `result.warnings`.
