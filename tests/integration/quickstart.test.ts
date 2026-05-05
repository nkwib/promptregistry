/**
 * End-to-end fixture walkthrough (issue 011).
 *
 * Spawns the *bundled* CLI binary (`./dist/cli/index.js`) — not the source.
 * That means this test requires a prior `npm run build`; if the dist artefact
 * is missing we skip the suite with a clear message rather than fail.
 *
 * Asserted shape:
 *   1. `codegen` exits 0 and writes the expected files.
 *   2. `check` exits 0 and prints "All checks passed".
 *   3. After silently editing the manifest, `check` exits 1 and prints the
 *      `hash-drift` error code.
 *
 * Wall-time budget: 30s.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_CHECKS_PASSED, HASH_DRIFT_CODE } from '../fixtures/expected-messages'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..', '..')
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js')
const fixtureManifest = join(repoRoot, 'examples', 'quickstart', 'manifest.json')

const haveBuild = existsSync(cliPath)

describe.skipIf(!haveBuild)('quickstart end-to-end (bundled CLI)', () => {
  let tmpRoot: string
  let manifestPath: string
  let outDir: string

  beforeAll(() => {
    if (!haveBuild) {
      console.warn(
        `[integration] skipping — bundled CLI not found at ${cliPath}. ` +
        `Run \`npm run build\` first.`,
      )
    }
  })

  function spawn(args: string[]) {
    return spawnSync('node', [cliPath, ...args], {
      cwd: tmpRoot,
      encoding: 'utf-8',
      env: process.env,
    })
  }

  it('codegen → check pass → silent edit → check fails with hash-drift', () => {
    const start = Date.now()
    tmpRoot = mkdtempSync(join(tmpdir(), 'promptregistry-quickstart-'))
    manifestPath = join(tmpRoot, 'manifest.json')
    outDir = join(tmpRoot, 'prompts', '.generated')

    try {
      copyFileSync(fixtureManifest, manifestPath)

      // 1) codegen
      const codegen = spawn([
        'codegen',
        '--manifest', './manifest.json',
        '--out', './prompts/.generated',
      ])
      expect(codegen.status, codegen.stderr).toBe(0)
      expect(existsSync(join(outDir, 'customer-summary.ts'))).toBe(true)
      expect(existsSync(join(outDir, 'welcome-message.ts'))).toBe(true)
      expect(existsSync(join(outDir, 'registry.ts'))).toBe(true)
      expect(existsSync(join(outDir, 'prompt-lock.json'))).toBe(true)

      // 2) check (clean state passes)
      const check1 = spawn([
        'check',
        '--manifest', './manifest.json',
        '--out', './prompts/.generated',
      ])
      expect(check1.status, check1.stderr).toBe(0)
      expect(check1.stdout).toContain(ALL_CHECKS_PASSED)

      // 3) Silently edit the first prompt's template (no version bump).
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      manifest.prompts[0].template = `${manifest.prompts[0].template} extra`
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

      // 4) check (drifted state fails with hash-drift)
      const check2 = spawn([
        'check',
        '--manifest', './manifest.json',
        '--out', './prompts/.generated',
      ])
      expect(check2.status).toBe(1)
      const combined = `${check2.stdout}\n${check2.stderr}`
      expect(combined).toContain(HASH_DRIFT_CODE)

      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(30_000)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  }, 30_000)
})
