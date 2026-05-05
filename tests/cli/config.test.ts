import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveConfig, defaultConfig } from '../../src/cli/config.js'

describe('resolveConfig', () => {
  const tmpDir = join(tmpdir(), 'promptregistry-config-test-' + Date.now())

  it('returns defaults when no config file exists', async () => {
    mkdirSync(tmpDir, { recursive: true })
    const { config, configPath } = await resolveConfig(tmpDir)
    expect(configPath).toBeNull()
    expect(config.manifestUrl).toBe(join(tmpDir, defaultConfig.manifestUrl))
    expect(config.srcRoots).toEqual([join(tmpDir, defaultConfig.srcRoots[0])])
    expect(config.outDir).toBe(join(tmpDir, defaultConfig.outDir))
  })

  it('reads promptregistry.config.json', async () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(
      join(tmpDir, 'promptregistry.config.json'),
      JSON.stringify({ manifestUrl: 'https://example.com/manifest.json', outDir: './generated' }),
    )
    const { config, configPath } = await resolveConfig(tmpDir)
    expect(configPath).toBe(join(tmpDir, 'promptregistry.config.json'))
    expect(config.manifestUrl).toBe('https://example.com/manifest.json')
    expect(config.outDir).toBe(join(tmpDir, 'generated'))
  })

  it('CLI flags override config file', async () => {
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(
      join(tmpDir, 'promptregistry.config.json'),
      JSON.stringify({ manifestUrl: 'https://example.com/manifest.json' }),
    )
    const { config } = await resolveConfig(tmpDir, {
      manifestUrl: 'https://other.com/manifest.json',
    })
    expect(config.manifestUrl).toBe('https://other.com/manifest.json')
  })

  // Cleanup
  it('cleanup', () => {
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
