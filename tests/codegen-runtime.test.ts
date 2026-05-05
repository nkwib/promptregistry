import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { codegen } from '../src/codegen'
import type { Manifest } from '../src/manifest/schema'
import type { CompiledTemplate } from '../src/promptkit'

describe('codegen runtime end-to-end', () => {
  let outDir: string

  beforeEach(() => {
    outDir = join(tmpdir(), `promptregistry-runtime-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(outDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true })
  })

  it('emits a runtime file that loads and renders correctly', async () => {
    const manifest: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        {
          name: 'customer-summary',
          version: 'v1',
          template: 'Hi {{customerName}} on {{planTier}}.',
          delimiter: { open: '{{', close: '}}' },
        },
      ],
    }

    codegen(manifest, {
      outDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })

    const fileUrl = pathToFileURL(join(outDir, 'customer-summary.ts')).href
    const mod = (await import(/* @vite-ignore */ fileUrl)) as {
      default: CompiledTemplate<{ customerName: string; planTier: string }>
    }

    const rendered = mod.default.with({ customerName: 'Ada', planTier: 'Pro' })
    expect(rendered).toBe('Hi Ada on Pro.')
    expect(mod.default.placeholders).toEqual(['customerName', 'planTier'])
  })

  it('barrel re-exports work via dynamic import', async () => {
    const manifest: Manifest = {
      'manifest-format-version': '1',
      prompts: [
        {
          name: 'greeting',
          version: 'v1',
          template: 'Hello {{name}}',
          delimiter: { open: '{{', close: '}}' },
        },
      ],
    }

    codegen(manifest, {
      outDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    })

    const fileUrl = pathToFileURL(join(outDir, 'registry.ts')).href
    const mod = (await import(/* @vite-ignore */ fileUrl)) as {
      greeting: CompiledTemplate<{ name: string }>
    }
    expect(mod.greeting.with({ name: 'Ada' })).toBe('Hello Ada')
  })
})
