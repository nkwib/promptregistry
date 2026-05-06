/**
 * Public package surface (per ADR-0004): types only.
 *
 * Runtime values consumed by codegen-emitted files live at
 * `promptregistry/runtime`. CLI lives at `bin/promptregistry`.
 */

export type { CompiledTemplate, PromptTag } from './promptkit.js'

// Manifest / Pin types — useful for tooling that wants to read a manifest or
// a `prompt-lock.json` file without re-deriving the shapes.
export type { Manifest, PromptEntry, Delimiter } from './manifest/schema.js'
export type { Lockfile, LockfileEntry } from './lockfile/io.js'

// Result shapes for programmatic users of `check`.
export type { CheckResult, CheckError, CheckWarning } from './check/index.js'

// Config shape so consumers can type their own `promptregistry.config.js`.
export type { PromptRegistryConfig } from './cli/config.js'
