---
id: 009
title: CLI skeleton and config resolution
milestone: week-1
estimate: 1d
depends_on: []
blocks: [007, 008]
awaits_adr: []
type: build
---

## Why

`promptregistry init`, `promptregistry check`, and the codegen step all need a shared CLI entry, argument parser, and config-resolution path before they can be implemented in parallel. Skipping this collapses into ad-hoc per-command argument shapes that drift.

## Scope

- A single `promptregistry` bin entry exposed via `package.json#bin`.
- Subcommand router (handwritten or via `cac`/`citty` — pick one zero-or-tiny-dep option).
- Config resolution order: CLI flag → `promptregistry.config.{ts,js,json}` → defaults.
- One config file shape with: `manifestUrl`, `srcRoots`, `outDir`.
- Help output for each subcommand stub.

## Acceptance criteria

- `promptregistry --help` enumerates all v1 subcommands.
- Vitest covers config-precedence (flag wins over file wins over default).
- Adding a new subcommand requires touching exactly one router file.

## Out of scope

- Telemetry / opt-in analytics — none in v1.
- Auto-detecting monorepo workspaces.

## Notes

Keep this small. The temptation is a "CLI framework" issue that takes 3 days. The bar is: enough plumbing to let issues 007 and 008 land cleanly.
