/**
 * Vitest coverage for the `promptregistry check --tsc` rewriter.
 *
 * Issue 010 acceptance: covers removed-placeholder, added-required-placeholder,
 * type-mismatch, and unrelated-tsc-error pass-through. Output strings must be
 * byte-identical to `tests/fixtures/expected-messages.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rewriteDiagnostics, type TscDiagnostic } from '../../src/check/tsc-rewrite.js'
import { codegen } from '../../src/codegen/index.js'
import {
  rewrittenRemovedVariable,
  rewrittenTypeContractChanged,
} from '../fixtures/expected-messages.js'
import type { Manifest } from '../../src/manifest/schema.js'

describe('rewriteDiagnostics (cross-file rewrite)', () => {
  let tmpDir: string
  let outDir: string
  const cwd = '/fake/project'
  const userFile = 'src/main.ts'

  const manifest: Manifest = {
    'manifest-format-version': '1',
    prompts: [
      {
        name: 'customer-summary',
        version: 'v1',
        template: 'Hello {{customerName}} on {{planTier}}, joined {{joinDate}}.',
        delimiter: { open: '{{', close: '}}' },
      },
    ],
  }

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `promptregistry-rewrite-test-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    )
    outDir = join(tmpDir, 'prompts', '.generated')
    mkdirSync(outDir, { recursive: true })
    codegen(manifest, {
      outDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('scenario 1: removed-placeholder — emits the locked removed-variable message', () => {
    // tsc surfaces this as: Property 'joinDate' is missing in type ... but
    // required in type 'CustomerSummaryVars'.
    const diag: TscDiagnostic = {
      file: { fileName: userFile },
      line: 5,
      code: 2741,
      messageText:
        "Property 'joinDate' is missing in type '{ customerName: string; planTier: string; }' but required in type 'CustomerSummaryVars'.",
      category: 1,
    }

    const [result] = rewriteDiagnostics([diag], cwd, outDir)

    expect(result.rewritten).toBe(
      rewrittenRemovedVariable({
        pin: 'customer-summary@v1',
        varName: 'joinDate',
        file: userFile,
        line: 5,
      }),
    )
  })

  it('scenario 2: added-required-placeholder — same external symptom, same rewrite', () => {
    // From the user's perspective the manifest grew a required key. tsc
    // produces the same "is missing" wording, so we treat it identically.
    const diag: TscDiagnostic = {
      file: { fileName: userFile },
      line: 7,
      code: 2741,
      messageText:
        "Property 'locale' is missing in type '{ customerName: string; planTier: string; joinDate: string; }' but required in type 'CustomerSummaryVars'.",
      category: 1,
    }

    const [result] = rewriteDiagnostics([diag], cwd, outDir)

    expect(result.rewritten).toBe(
      rewrittenRemovedVariable({
        pin: 'customer-summary@v1',
        varName: 'locale',
        file: userFile,
        line: 7,
      }),
    )
  })

  it('scenario 3: type-mismatch — falls back to the type-contract-changed message', () => {
    const diag: TscDiagnostic = {
      file: { fileName: userFile },
      line: 9,
      code: 2322,
      messageText:
        "Type 'number' is not assignable to type 'string'. The expected shape is 'CustomerSummaryVars'.",
      category: 1,
    }

    const [result] = rewriteDiagnostics([diag], cwd, outDir)

    expect(result.rewritten).toBe(
      rewrittenTypeContractChanged('customer-summary@v1'),
    )
  })

  it('scenario 4: unrelated tsc error passes through unchanged', () => {
    const diag: TscDiagnostic = {
      file: { fileName: userFile },
      line: 12,
      code: 1005,
      messageText: "',' expected.",
      category: 1,
    }

    const [result] = rewriteDiagnostics([diag], cwd, outDir)

    // Pass-through format from formatOriginalDiagnostic.
    expect(result.rewritten).toBe(`${userFile}: error TS1005: ',' expected.`)
  })

  it('also rewrites diagnostics whose source file is the generated module itself', () => {
    // Simulate tsc pointing inside the generated `customer-summary.ts`.
    const diag: TscDiagnostic = {
      file: { fileName: join(outDir, 'customer-summary.ts') },
      line: 3,
      code: 2339,
      messageText: "Property 'joinDate' does not exist on type 'CustomerSummaryVars'.",
      category: 1,
    }

    const [result] = rewriteDiagnostics([diag], cwd, outDir)

    // For inside-outDir diagnostics the relative path is the generated file's
    // path relative to cwd. We just assert the prefix and the variable name —
    // the launch-demo case is the cross-file scenario above.
    expect(result.rewritten).toContain(
      "Remote prompt 'customer-summary@v1' removed variable 'joinDate'",
    )
  })
})
