#!/usr/bin/env node
import { cac } from 'cac'
import { resolveConfig } from './config.js'
import { version } from '../version.js'
import { codegen } from '../codegen/index.js'
import { check } from '../check/index.js'
import { runTscRewrite } from '../check/tsc-rewrite.js'
import { createLockfile, writeLockfile } from '../lockfile/io.js'
import { fetchManifest } from '../manifest/fetcher.js'
import { init } from '../init/index.js'
import type { PromptEntry } from '../manifest/schema.js'
import { join } from 'node:path'

const cli = cac('promptregistry')

cli
  .version(version)
  .help()

cli
  .command('codegen', 'Generate .d.ts and registry.ts from the manifest')
  .option('--manifest <url>', 'Manifest URL or path')
  .option('--src <dirs>', 'Source directories (comma-separated)')
  .option('--out <dir>', 'Output directory')
  .action(async (options) => {
    const cwd = process.cwd()
    const { config } = await resolveConfig(cwd, parseOverrides(options))

    const fetched = await fetchManifest(config.manifestUrl)
    codegen(fetched.manifest, {
      outDir: config.outDir,
      manifestUrl: config.manifestUrl,
      manifestHash: fetched.hash,
    })

    // Write lockfile
    const lockfile = createLockfile(
      fetched.manifest.prompts.map((p: PromptEntry) => ({
        name: p.name,
        version: p.version,
        manifest_url: config.manifestUrl,
        content_hash: fetched.hash,
        pulled_at: new Date().toISOString(),
      })),
    )
    writeLockfile(join(config.outDir, 'prompt-lock.json'), lockfile)

    console.log(`Generated ${fetched.manifest.prompts.length} prompt definitions in ${config.outDir}`)
  })

cli
  .command('check', 'Cross-check manifest, lockfile, and generated files')
  .option('--tsc', 'Run tsc --noEmit and rewrite diagnostics')
  .option('--manifest <url>', 'Manifest URL or path')
  .option('--src <dirs>', 'Source directories (comma-separated)')
  .option('--out <dir>', 'Output directory')
  .action(async (options) => {
    const cwd = process.cwd()
    const { config } = await resolveConfig(cwd, parseOverrides(options))

    const result = await check(config)

    for (const error of result.errors) {
      console.error(`Error [${error.code}]: ${error.message}`)
    }
    for (const warning of result.warnings) {
      console.warn(`Warning [${warning.code}]: ${warning.message}`)
    }

    if (!result.ok) {
      process.exit(1)
    }

    console.log('All checks passed.')

    if (options.tsc) {
      const tscResult = await runTscRewrite(cwd, config.outDir)
      if (tscResult.output) {
        console.log(tscResult.output)
      }
      if (tscResult.exitCode !== 0) {
        process.exit(tscResult.exitCode)
      }
    }
  })

cli
  .command('lock', 'Write prompt-lock.json from the current manifest')
  .option('--manifest <url>', 'Manifest URL or path')
  .option('--out <dir>', 'Output directory')
  .action(async (options) => {
    const cwd = process.cwd()
    const { config } = await resolveConfig(cwd, parseOverrides(options))

    const fetched = await fetchManifest(config.manifestUrl)
    const lockfile = createLockfile(
      fetched.manifest.prompts.map((p: PromptEntry) => ({
        name: p.name,
        version: p.version,
        manifest_url: config.manifestUrl,
        content_hash: fetched.hash,
        pulled_at: new Date().toISOString(),
      })),
    )
    writeLockfile(join(config.outDir, 'prompt-lock.json'), lockfile)

    console.log(`Wrote lockfile with ${fetched.manifest.prompts.length} entries`)
  })

cli
  .command('init', 'Scaffold manifest from existing prompt() call-sites')
  .option('--src <dir>', 'Source directory to scan')
  .action(async (options) => {
    const cwd = process.cwd()
    const { config } = await resolveConfig(cwd, parseOverrides(options))

    const result = await init(config)
    console.log(`Scaffolded manifest at ${result.manifestPath} with ${result.promptsFound} prompts`)
  })

function parseOverrides(options: Record<string, unknown>): Partial<import('./config.js').PromptRegistryConfig> {
  const overrides: Partial<import('./config.js').PromptRegistryConfig> = {}

  if (typeof options.manifest === 'string') {
    overrides.manifestUrl = options.manifest
  }
  if (typeof options.src === 'string') {
    overrides.srcRoots = options.src.split(',').map((s) => s.trim())
  }
  if (typeof options.out === 'string') {
    overrides.outDir = options.out
  }

  return overrides
}

cli.parse()
