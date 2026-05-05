import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetchManifest } from '../src/manifest/fetcher'
import { codegen } from '../src/codegen'
import { check } from '../src/check'
import { createLockfile, writeLockfile } from '../src/lockfile/io'

describe('end-to-end fixture', () => {
  const tmpDir = join(tmpdir(), 'promptregistry-e2e-' + Date.now())
  const manifestPath = join(tmpDir, 'manifest.json')
  const outDir = join(tmpDir, 'prompts', '.generated')

  function setupManifest() {
    const manifest = {
      'manifest-format-version': '1',
      prompts: [
        {
          name: 'greeting',
          version: 'v1',
          template: 'Hello {{name}}!',
          delimiter: { open: '{{', close: '}}' },
        },
      ],
    }
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  }

  it('full flow: codegen -> check passes -> edit manifest -> check fails', async () => {
    setupManifest()

    // Step 1: Fetch manifest and codegen
    const fetched = await fetchManifest(manifestPath)
    codegen(fetched.manifest, {
      outDir,
      manifestUrl: manifestPath,
      manifestHash: fetched.hash,
    })

    // Write lockfile
    const lockfile = createLockfile(
      fetched.manifest.prompts.map((p) => ({
        name: p.name,
        version: p.version,
        manifest_url: manifestPath,
        content_hash: fetched.hash,
        pulled_at: new Date().toISOString(),
      })),
    )
    writeLockfile(join(outDir, 'prompt-lock.json'), lockfile)

    // Verify generated files exist
    expect(existsSync(join(outDir, 'greeting.ts'))).toBe(true)
    expect(existsSync(join(outDir, 'registry.ts'))).toBe(true)
    expect(existsSync(join(outDir, 'prompt-lock.json'))).toBe(true)

    // Step 2: Check passes
    const checkResult1 = await check({
      manifestUrl: manifestPath,
      srcRoots: [join(tmpDir, 'src')],
      outDir,
    })
    expect(checkResult1.ok).toBe(true)

    // Step 3: Edit manifest without version bump
    const editedManifest = {
      'manifest-format-version': '1',
      prompts: [
        {
          name: 'greeting',
          version: 'v1',
          template: 'Hello {{name}}! Welcome!',
          delimiter: { open: '{{', close: '}}' },
        },
      ],
    }
    writeFileSync(manifestPath, JSON.stringify(editedManifest, null, 2))

    // Step 4: Check fails (hash drift)
    const checkResult2 = await check({
      manifestUrl: manifestPath,
      srcRoots: [join(tmpDir, 'src')],
      outDir,
    })
    expect(checkResult2.ok).toBe(false)
    expect(checkResult2.errors.some((e) => e.code === 'hash-drift')).toBe(true)
  })

  it('registry barrel has correct named exports', async () => {
    setupManifest()

    const fetched = await fetchManifest(manifestPath)
    codegen(fetched.manifest, {
      outDir,
      manifestUrl: manifestPath,
      manifestHash: fetched.hash,
    })

    const registryContent = readFileSync(join(outDir, 'registry.ts'), 'utf-8')
    expect(registryContent).toContain("export { default as greeting } from './greeting.js'")
  })

  // Cleanup
  it('cleanup', () => {
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
