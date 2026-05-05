---
id: 007
title: promptregistry check — cross-check call-sites, manifest, lockfile, remote
milestone: week-3
estimate: 3d
depends_on: [004, 006]
blocks: [010]
type: build

## Why

`promptregistry check` is the stale-codegen firewall. Without it, a teammate edits the remote prompt, forgets to re-run codegen, the `.d.ts` header hash diverges from the lockfile, and `tsc` happily compiles against the old types. Three failure modes must be detected loudly: stale `.d.ts` (header hash != lockfile hash), drifted remote (lockfile hash != current remote hash), drifted call-site (a `pull()` call-site references a `Pin` not in the manifest). See ADR-0005 and ADR-0006.

## Scope

- CLI subcommand `promptregistry check` that:
  - Loads the local `Manifest`, `prompt-lock.json`, and the generated `.d.ts` headers.
  - Walks all `pull()` call-sites in the configured source roots via static analysis.
  - Asserts: every call-site `Pin` exists in the manifest; every manifest entry has a lockfile entry; every `.d.ts` header hash equals the lockfile hash; the lockfile hash equals the live remote hash (one network call per unique manifest URL).
  - Exits non-zero with a categorised error per failure kind.

## Acceptance criteria

- Vitest covers each of the four failure modes plus the all-green case.
- Single-command run on a known-good fixture is < 2s without network, < 5s with.
- Errors name the offending file and line for call-site failures.

## Out of scope

- The `tsc --noEmit` rewrite — that is issue 010 and runs after `check` passes.
- Auto-fix flag — fail loudly only.

## Notes

Resolved by ADR-0006: recommended placement is `package.json` build-script integration (`"typecheck": "promptregistry check && tsc --noEmit"`) plus a CI snippet. No pre-commit hook.
