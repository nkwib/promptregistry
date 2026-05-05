/**
 * Locked wording for the `promptregistry check --tsc` rewriter.
 *
 * Issues 010 / 011 / 014 are byte-coupled to these strings. Any change here
 * must be coordinated with the README hero screenshot (issue 014) and the
 * end-to-end snapshot test (issue 011). The test fixture
 * `tests/fixtures/expected-messages.ts` re-exports these helpers so tests and
 * the rewriter share a single source of truth.
 */

export interface RemovedVariableContext {
  pin: string
  varName: string
  file: string
  line: number
}

export interface AddedRequiredVariableContext {
  pin: string
  varName: string
  file: string
  line: number
}

export function rewrittenRemovedVariable(ctx: RemovedVariableContext): string {
  return `Remote prompt '${ctx.pin}' removed variable '${ctx.varName}' — update the call site (${ctx.file}:${ctx.line}) or pin to a previous version.`
}

export function rewrittenTypeContractChanged(pin: string): string {
  return `Remote prompt '${pin}' type contract changed — run 'promptregistry codegen' to update or pin to a previous version.`
}

export function rewrittenAddedRequiredVariable(ctx: AddedRequiredVariableContext): string {
  return `Remote prompt '${ctx.pin}' added required variable '${ctx.varName}' — pass it at the call site (${ctx.file}:${ctx.line}) or pin to a previous version.`
}

/**
 * `promptregistry check` success line. The integration test (issue 011) and
 * any future hero screenshot are byte-coupled to this string.
 */
export const ALL_CHECKS_PASSED = 'All checks passed'

/**
 * The `check` error code printed when the manifest hash drifts from the
 * locked hash recorded in `prompt-lock.json`. Wired in `src/check/index.ts`.
 */
export const HASH_DRIFT_CODE = 'hash-drift'
