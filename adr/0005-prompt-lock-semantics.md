---
status: accepted
---

# `prompt-lock.json` semantics: committed, fail-only-on-check, three hard errors + one warning

## Committed to git

`prompt-lock.json` is committed, not gitignored. The analogy to `package-lock.json` is intentional: it pins the manifest content hashes for reproducible codegen across teammates and CI. A gitignored lockfile would mean every engineer has their own hashes, and the "teammate edits the manifest, CI catches it" story collapses.

## Fail-only-on-check at runtime

The internal `pull()` utility does **not** throw when the lockfile is stale or missing. Runtime remains permissive. The integrity gate is `promptregistry check` (and its `--tsc` variant). This keeps the runtime lean and makes the check command load-bearing.

## What counts as drift

`promptregistry check` evaluates four conditions per Pin:

1. **Hash drift (hard error):** The remote manifest content hash differs from the lockfile hash. This is the silent-shipping bug the lockfile exists to catch — someone edited the manifest without bumping the version.
2. **Version drift (hard error):** The manifest now contains a newer version tag for the same prompt name, but the code is pinned to an older version. This signals "a newer version exists; you may want to upgrade."
3. **Missing pin (hard error):** A `pull()` call-site (via generated code) references a `Pin` that has no entry in the lockfile. The lockfile is incomplete.
4. **Orphaned lockfile entry (warning, non-blocking):** The lockfile has an entry for a `Pin` that no call-site references. This is housekeeping noise, not a failure.

## Considered options

- **Gitignored lockfile.** Rejected — defeats cross-team reproducibility.
- **Fail-on-pull at runtime.** Rejected — runtime should not depend on build artifacts for correctness; the check command is the explicit gate.
- **Treat version drift as a warning only.** Rejected — being pinned to a stale version is a real contract risk in a team where PMs iterate prompts rapidly.
- **Treat orphaned entries as hard errors.** Rejected — they are harmless dead weight; failing CI on housekeeping creates noise.

## Consequences

- CI must run `promptregistry check` (or `promptregistry check --tsc`) as a mandatory step.
- The lockfile schema must include a `warnings` array so the check command can surface orphaned entries without failing the exit code.
- The README will show `"typecheck": "promptregistry check && tsc --noEmit"` as the canonical build script.
