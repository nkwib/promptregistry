---
id: 011
title: End-to-end fixture — sample repo proving the full flow
milestone: week-4
estimate: 1d
depends_on: [003, 008, 010]
blocks: [014, 016]
awaits_adr: []
type: build
---

## Why

The 60-second pitch is "clone repo, run init, run codegen, edit remote prompt, watch tsc fail with a human message." Without an end-to-end fixture exercising that exact sequence, any one piece can regress in isolation while the integration story silently breaks.

## Scope

- A fixture repo (under `examples/quickstart` in the main repo, not a separate repo) containing:
  - One TS source file with two `prompt()` declarations.
  - A pre-generated `manifest.json` and `prompt-lock.json`.
  - A README walking the user through: `pnpm install`, `promptregistry init`, codegen, a typed `pull(...)` call, a deliberate manifest edit, `promptregistry check --tsc` showing the rewritten error.
- A Vitest integration test that runs each step in a temp dir and asserts each command's exit code and stdout shape.

## Acceptance criteria

- The fixture runs green from a clean clone in CI.
- Total wall time of the integration test < 30s.
- The error-message snapshot in the test matches the README screenshot byte-for-byte (coupled with issue 010).

## Out of scope

- Multi-repo / monorepo fixtures.
- Performance benchmarking.

## Notes

This issue catches the integration drift that unit tests in issues 001-010 cannot — particularly that the CLI binary actually wires up against the same code paths the SDK consumers see.
