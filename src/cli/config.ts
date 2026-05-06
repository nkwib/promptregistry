/**
 * Config resolution for promptregistry CLI.
 *
 * Resolution order (highest priority wins):
 * 1. CLI flags
 * 2. promptregistry.config.{js,mjs,cjs,json}
 * 3. Defaults
 *
 * `.ts` configs are detected but rejected with a friendly error: the built
 * CLI is plain JS and does not ship a TypeScript loader. See loadConfigFile.
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

// `.strict()` so typos in promptregistry.config.* surface as a config error
// instead of being silently ignored. This is a user-facing config: anything
// extra in here is almost certainly a mistake.
const partialConfigSchema = z.object({
  manifestUrl: z.string().min(1).optional(),
  srcRoots: z.array(z.string().min(1)).optional(),
  outDir: z.string().min(1).optional(),
}).strict()

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
    // The built CLI runs as plain JS — Node's `import()` cannot read `.ts`
    // sources without a loader (`tsx`, `ts-node`, `jiti`, …). We don't ship
    // one, so refuse early with an actionable message instead of letting the
    // user hit a cryptic ERR_UNKNOWN_FILE_EXTENSION at runtime.
    if (configPath.endsWith('.ts') || configPath.endsWith('.mts') || configPath.endsWith('.cts')) {
      throw new ConfigError(
        `Cannot load TypeScript config "${configPath}". The promptregistry CLI does not bundle a TypeScript loader. ` +
        `Use a .js / .mjs / .json config, or run the CLI through a loader (e.g. \`tsx node_modules/.bin/promptregistry ...\`).`,
        'load-failed',
      )
    }
    const fileUrl = pathToFileURL(configPath).href
    let module: { default?: unknown } & Record<string, unknown>
    try {
      module = await import(fileUrl) as { default?: unknown } & Record<string, unknown>
    } catch (error) {
      throw new ConfigError(
        `Failed to load config ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        'load-failed',
      )
    }
    raw = isPlainObject(module.default) ? module.default : module
  }

  // For non-JSON modules the imported namespace also includes ESM machinery
  // like `default` / Symbol.toStringTag. Strip down to a plain object whose
  // keys came from the user before handing it to the strict Zod schema, so
  // we only flag keys the *user* actually wrote.
  let candidate: unknown = raw
  if (isPlainObject(raw)) {
    const userKeys = Object.keys(raw).filter(
      (k) => k !== 'default' && k !== '__esModule',
    )
    candidate = Object.fromEntries(userKeys.map((k) => [k, raw[k]]))
  }

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
