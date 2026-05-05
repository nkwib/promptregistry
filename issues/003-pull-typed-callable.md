---
id: 003
title: pull('prompt-name@v3') typed callable returning a Compiled template
milestone: week-2
estimate: 2d
depends_on: [001, 002]
blocks: [004, 011]
type: build

## Why

The internal `pull('customer-summary@v3')` utility resolves a `Pin` (name + version) against the local `Manifest` and returns a promptkit `Compiled template`. The generated barrel (issue 005) calls this internally; consumers never import it directly. See ADR-0004.

## Scope

- Function `pull(pin: string)` that:
  - Parses the `Pin` into `{ name, version }`.
  - Looks up the entry in the local manifest snapshot (loaded once at process start, no module-level singleton mutation — respect promptkit ADR-0003 invariants).
  - Constructs a promptkit `Compiled template` using the entry's `template` and `delimiter` fields, via `makePromptTag({ open, close })`.
- Throws a typed `PullError` with one error code per failure (unknown name, unknown version, malformed pin).
- Not exported from the package — consumed only by generated code in the barrel (ADR-0004).

## Acceptance criteria

- Vitest covers happy path, unknown pin, malformed pin, and that the returned `Compiled template` exposes `.with`, `.partial`, `.validate`, `.validateSafe`.
- Inferred `Variables object` shape on the call site matches the placeholders in the `template`.
- No top-level await, no module-level cache (promptkit ADR-0003 invariants).

## Out of scope

- The codegen-rewritten typed signature — see issue 005.
- Lockfile verification at runtime — that's `promptregistry check`, not `pull`.

## Notes

Resolved by ADR-0004: `pull()` is internal only; the public surface is named imports from the generated barrel.
