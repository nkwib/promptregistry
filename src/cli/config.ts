/**
 * Config resolution for promptregistry CLI.
 *
 * Resolution order (highest priority wins):
 * 1. CLI flags
 * 2. promptregistry.config.{ts,js,json}
 * 3. Defaults
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

export interface PromptRegistryConfig {
  /** URL or local path to the manifest JSON */
  manifestUrl: string
  /** Source directories to scan for call-sites */
  srcRoots: string[]
  /** Output directory for generated files */
  outDir: string
}

const partialConfigSchema = z.object({
  manifestUrl: z.string().min(1).optional(),
  srcRoots: z.array(z.string().min(1)).optional(),
  outDir: z.string().min(1).optional(),
})

export const defaultConfig: PromptRegistryConfig = {
  manifestUrl: './manifest.json',
  srcRoots: ['./src'],
  outDir: './prompts/.generated',
}

export class ConfigError extends Error {
  constructor(message: string, public readonly code: 'invalid-config' | 'load-failed') {
    super(message)
    this.name = 'ConfigError'
  }
}

export async function resolveConfig(
  cwd: string,
  overrides: Partial<PromptRegistryConfig> = {},
): Promise<{ config: PromptRegistryConfig; configPath: string | null }> {
  const configPath = findConfigFile(cwd)

  let fileConfig: Partial<PromptRegistryConfig> = {}
  if (configPath) {
    fileConfig = await loadConfigFile(configPath)
  }

  const config: PromptRegistryConfig = {
    manifestUrl: overrides.manifestUrl ?? fileConfig.manifestUrl ?? defaultConfig.manifestUrl,
    srcRoots: overrides.srcRoots ?? fileConfig.srcRoots ?? defaultConfig.srcRoots,
    outDir: overrides.outDir ?? fileConfig.outDir ?? defaultConfig.outDir,
  }

  // Resolve relative paths against cwd
  config.manifestUrl = resolveRelative(config.manifestUrl, cwd)
  config.srcRoots = config.srcRoots.map((r) => resolveRelative(r, cwd))
  config.outDir = resolveRelative(config.outDir, cwd)

  return { config, configPath }
}

function findConfigFile(cwd: string): string | null {
  const extensions = ['.ts', '.js', '.json']
  const baseName = 'promptregistry.config'

  for (const ext of extensions) {
    const path = resolve(cwd, baseName + ext)
    if (existsSync(path)) {
      return path
    }
  }
  return null
}

async function loadConfigFile(configPath: string): Promise<Partial<PromptRegistryConfig>> {
  let raw: unknown
  if (configPath.endsWith('.json')) {
    try {
      raw = JSON.parse(readFileSync(configPath, 'utf-8'))
    } catch (error) {
      throw new ConfigError(
        `Failed to parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        'load-failed',
      )
    }
  } else {
    const fileUrl = pathToFileURL(configPath).href
    const module = await import(fileUrl) as { default?: unknown } & Record<string, unknown>
    raw = isPlainObject(module.default) ? module.default : module
  }

  const candidate = isPlainObject(raw)
    ? {
        manifestUrl: raw.manifestUrl,
        srcRoots: raw.srcRoots,
        outDir: raw.outDir,
      }
    : raw

  const parsed = partialConfigSchema.safeParse(candidate)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new ConfigError(`Invalid config at ${configPath}: ${issues}`, 'invalid-config')
  }
  return parsed.data
}

function resolveRelative(path: string, cwd: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return resolve(cwd, path)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
