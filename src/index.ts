/**
 * Public package surface (per ADR-0004): types only.
 *
 * Runtime values consumed by codegen-emitted files live at
 * `promptregistry/runtime`. CLI lives at `bin/promptregistry`.
 */

export type { CompiledTemplate, PromptTag } from './promptkit.js'
