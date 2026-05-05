---
id: 006
title: prompt-lock.json format — manifest URL + content hash + version pin
milestone: week-3
estimate: 1d
depends_on: [001, 002]
blocks: [007]
type: build

## Why

Three personas (Matt, Theo, Rauch) independently proposed a lockfile from three angles. `prompt-lock.json` is the package-lock.json analog that pins the manifest URL, content hash, and version `Pin` together so any drift between the local manifest and the remote surfaces as a hash mismatch. Without this, "remote prompt edited without a version bump" is silent. See ADR-0005.

## Scope

- A `prompt-lock.json` schema with: lockfile-format-version, an array of entries, each carrying `name`, `version`, `manifest_url`, `content_hash`, `pulled_at`.
- A `promptregistry lock` command that writes the lockfile from the current local manifest.
- A read function consumed by `promptregistry check` (issue 007).
- Loud failure when a `pull()` call-site references a `Pin` that has no lockfile entry (the failure is surfaced by `promptregistry check`, not at runtime — ADR-0005).

## Acceptance criteria

- Vitest covers writing, reading, and diffing two lockfiles.
- Round-trip determinism: write, read, write again — byte-identical.
- Documentation in the issue body of how the lockfile composes with `npm` / `pnpm` lockfiles (i.e. it doesn't — separate concern).

## Out of scope

- Lockfile auto-update on remote drift (the point is to fail loudly, not auto-heal).
- Multi-manifest lockfiles.

## Notes

Resolved by ADR-0005: lockfile is committed; failures are surfaced only by `promptregistry check` (not at runtime); hard errors on hash drift, version drift, and missing pin; warnings on orphaned entries.
