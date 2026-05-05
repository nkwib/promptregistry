import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { codegen } from '../src/codegen'
import type { Manifest } from '../src/manifest/schema'

describe('codegen', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `promptregistry-codegen-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  const manifest: Manifest = {
    'manifest-format-version': '1',
    prompts: [
      {
        name: 'customer-summary',
        version: 'v1',
        template: 'Hello {{customerName}}, your plan is {{planTier}}.',
        delimiter: { open: '{{', close: '}}' },
      },
      {
        name: 'welcome',
        version: 'v2',
        template: 'Welcome {{userName}}!',
        delimiter: { open: '{{', close: '}}' },
      },
    ],
  }

  it('emits a runtime .ts per prompt and a registry barrel', () => {
    codegen(manifest, {
      outDir: tmpDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })

    const files = readdirSync(tmpDir)
    expect(files).toContain('customer-summary.ts')
    expect(files).toContain('welcome.ts')
    expect(files).toContain('registry.ts')
    expect(files).not.toContain('customer-summary.d.ts')
  })

  it('runtime file contains the manifest hash header and a CompiledTemplate type', () => {
    codegen(manifest, {
      outDir: tmpDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })

    const content = readFileSync(join(tmpDir, 'customer-summary.ts'), 'utf-8')
    expect(content).toContain('// Hash: abc123')
    expect(content).toContain('// Pin: customer-summary@v1')
    expect(content).toContain('customerName: string')
    expect(content).toContain('planTier: string')
    expect(content).toContain("from '@nkwib/promptregistry/runtime'")
    expect(content).toContain('export type CustomerSummaryVars')
  })

  it('registry barrel re-exports named imports from sibling .js paths', () => {
    codegen(manifest, {
      outDir: tmpDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })

    const content = readFileSync(join(tmpDir, 'registry.ts'), 'utf-8')
    expect(content).toContain("export { default as customerSummary } from './customer-summary.js'")
    expect(content).toContain("export { default as welcome } from './welcome.js'")
  })

  it('handles a prompt with no placeholders', () => {
    const noPh: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: 'static', version: 'v1', template: 'no placeholders here', delimiter: { open: '{{', close: '}}' } },
      ],
    }
    codegen(noPh, {
      outDir: tmpDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc',
    })
    const content = readFileSync(join(tmpDir, 'static.ts'), 'utf-8')
    expect(content).toContain('Record<string, never>')
  })

  it('fails on identifier collision', () => {
    const collisionManifest: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: 'my-prompt', version: 'v1', template: 'Hello', delimiter: { open: '{{', close: '}}' } },
        { name: 'myPrompt', version: 'v1', template: 'Hi', delimiter: { open: '{{', close: '}}' } },
      ],
    }

    expect(() =>
      codegen(collisionManifest, {
        outDir: tmpDir,
        manifestUrl: 'https://example.com/manifest.json',
        manifestHash: 'abc123',
      }),
    ).toThrow(/collision/i)
  })

  it('rejects manifest names that escape the regex', () => {
    const badManifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: '../../etc/passwd', version: 'v1', template: 'x', delimiter: { open: '{{', close: '}}' } },
      ],
    } as unknown as Manifest

    expect(() =>
      codegen(badManifest, {
        outDir: tmpDir,
        manifestUrl: 'https://example.com/manifest.json',
        manifestHash: 'abc123',
      }),
    ).toThrow(/Invalid prompt name/)
  })

  it('JSON-escapes templates that contain quotes', () => {
    const tricky: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: 'tricky', version: 'v1', template: 'a "{{name}}" with "quotes"\n', delimiter: { open: '{{', close: '}}' } },
      ],
    }
    codegen(tricky, { outDir: tmpDir, manifestUrl: 'm', manifestHash: 'h' })
    const content = readFileSync(join(tmpDir, 'tricky.ts'), 'utf-8')
    // The template should be a valid string literal (JSON.stringify produces escaped form)
    expect(content).toContain('"a \\"{{name}}\\" with \\"quotes\\"\\n"')
  })
})
