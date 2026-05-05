/**
 * `promptregistry check` implementation.
 *
 * Cross-checks manifest, lockfile, generated runtime files, and remote hash.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fetchManifest } from '../manifest/fetcher.js'
import { readLockfile, findLockfileEntry, type Lockfile } from '../lockfile/io.js'
import { parseDtsHeader } from '../codegen/header.js'
import { parsePin } from '../pin.js'
import type { PromptRegistryConfig } from '../cli/config.js'

export interface CheckResult {
  ok: boolean
  errors: CheckError[]
  warnings: CheckWarning[]
}

export interface CheckError {
  code:
    | 'hash-drift'
    | 'version-drift'
    | 'missing-pin'
    | 'stale-dts'
    | 'missing-lockfile'
    | 'manifest-fetch-failed'
  message: string
  pin?: string
}

export interface CheckWarning {
  code: 'orphaned-entry'
  message: string
  pin: string
}

const SKIP_FILENAMES = new Set(['registry.ts'])

export async function check(config: PromptRegistryConfig): Promise<CheckResult> {
  const errors: CheckError[] = []
  const warnings: CheckWarning[] = []

  // 1. Load manifest
  let manifestHash: string
  try {
    const fetched = await fetchManifest(config.manifestUrl)
    manifestHash = fetched.hash
  } catch (error) {
    return {
      ok: false,
      errors: [{
        code: 'manifest-fetch-failed',
        message: `Failed to fetch manifest: ${error instanceof Error ? error.message : String(error)}`,
      }],
      warnings: [],
    }
  }

  // 2. Load lockfile
  const lockfilePath = join(config.outDir, 'prompt-lock.json')
  let lockfile: Lockfile | null = null
  if (existsSync(lockfilePath)) {
    try {
      lockfile = readLockfile(lockfilePath)
    } catch (error) {
      errors.push({
        code: 'missing-lockfile',
        message: `Failed to read lockfile: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  } else {
    errors.push({
      code: 'missing-lockfile',
      message: `Lockfile not found: ${lockfilePath}`,
    })
  }

  // 3. Scan generated .ts files (excluding the barrel)
  const generatedFiles = existsSync(config.outDir)
    ? readdirSync(config.outDir).filter(
        (f) => f.endsWith('.ts') && !SKIP_FILENAMES.has(f),
      )
    : []

  const seenPins = new Set<string>()

  for (const file of generatedFiles) {
    const content = readFileSync(join(config.outDir, file), 'utf-8')
    const header = parseDtsHeader(content)
    if (!header) continue

    seenPins.add(header.pin)

    if (lockfile) {
      let parsed
      try {
        parsed = parsePin(header.pin)
      } catch {
        errors.push({
          code: 'missing-pin',
          message: `Generated file ${file} has malformed pin "${header.pin}"`,
          pin: header.pin,
        })
        continue
      }
      const entry = findLockfileEntry(lockfile, parsed.name, parsed.version)
      if (entry) {
        if (entry.content_hash !== header.hash) {
          errors.push({
            code: 'stale-dts',
            message: `Stale generated file for ${header.pin}: header hash ${header.hash} != lockfile hash ${entry.content_hash}`,
            pin: header.pin,
          })
        }
        if (entry.content_hash !== manifestHash) {
          errors.push({
            code: 'hash-drift',
            message: `Hash drift for ${header.pin}: lockfile hash ${entry.content_hash} != remote hash ${manifestHash}`,
            pin: header.pin,
          })
        }
      } else {
        errors.push({
          code: 'missing-pin',
          message: `Pin ${header.pin} has a generated file but no lockfile entry`,
          pin: header.pin,
        })
      }
    }
  }

  // 4. Check for orphaned lockfile entries
  if (lockfile) {
    for (const entry of lockfile.entries) {
      const pin = `${entry.name}@${entry.version}`
      if (!seenPins.has(pin)) {
        warnings.push({
          code: 'orphaned-entry',
          message: `Orphaned lockfile entry: ${pin}`,
          pin,
        })
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}
