/**
 * Locked wording for the `promptregistry check --tsc` rewriter.
 *
 * Re-exports from `src/check/messages.ts` so tests and the rewriter share a
 * single source of truth. Issues 010 / 011 / 014 are byte-coupled to these
 * strings — any change must be coordinated with the README hero screenshot
 * (issue 014) and the end-to-end snapshot test (issue 011).
 */

export {
  rewrittenRemovedVariable,
  rewrittenTypeContractChanged,
  rewrittenAddedRequiredVariable,
  ALL_CHECKS_PASSED,
  HASH_DRIFT_CODE,
} from '../../src/check/messages.js'
export type {
  RemovedVariableContext,
  AddedRequiredVariableContext,
} from '../../src/check/messages.js'
