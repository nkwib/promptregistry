/**
 * Lockfile schema and I/O.
 *
 * prompt-lock.json is committed to git. See ADR-0005.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'

export const lockfileEntrySchema = z.object({
  name: z.string(),
  version: z.string(),
  manifest_url: z.string(),
  content_hash: z.string(),
  pulled_at: z.string(),
})

export const lockfileSchema = z.object({
  'lockfile-format-version': z.literal('1'),
  entries: z.array(lockfileEntrySchema),
})

export type Lockfile = z.infer<typeof lockfileSchema>
export type LockfileEntry = z.infer<typeof lockfileEntrySchema>

export function readLockfile(path: string): Lockfile {
  const content = readFileSync(path, 'utf-8')
  const data = JSON.parse(content)
  return lockfileSchema.parse(data)
}

export function writeLockfile(path: string, lockfile: Lockfile): void {
  mkdirSync(dirname(path), { recursive: true })
  const content = JSON.stringify(lockfile, null, 2) + '\n'
  writeFileSync(path, content)
}

export function createLockfile(entries: LockfileEntry[]): Lockfile {
  return {
    'lockfile-format-version': '1',
    entries: entries.sort((a, b) => {
      const pinA = `${a.name}@${a.version}`
      const pinB = `${b.name}@${b.version}`
      return pinA.localeCompare(pinB)
    }),
  }
}

export function findLockfileEntry(lockfile: Lockfile, name: string, version: string): LockfileEntry | undefined {
  return lockfile.entries.find((e) => e.name === name && e.version === version)
}

/**
 * Preserve `pulled_at` from an existing lockfile when the (name, version,
 * content_hash) triple is unchanged. Only stamp a new `pulled_at` for
 * genuinely new or changed entries. Used by codegen/lock to keep the
 * lockfile byte-stable across re-runs.
 */
export function mergePulledAt(
  existing: Lockfile | null,
  fresh: LockfileEntry[],
): LockfileEntry[] {
  if (!existing) return fresh
  return fresh.map((entry) => {
    const prior = existing.entries.find(
      (e) =>
        e.name === entry.name &&
        e.version === entry.version &&
        e.content_hash === entry.content_hash,
    )
    if (prior) {
      return { ...entry, pulled_at: prior.pulled_at }
    }
    return entry
  })
}

/**
 * Read an existing lockfile if present; return null on missing or malformed
 * file (callers treat that as "no prior state").
 */
export function readLockfileIfExists(path: string): Lockfile | null {
  if (!existsSync(path)) return null
  try {
    return readLockfile(path)
  } catch {
    // Malformed JSON or schema mismatch — callers expect null so they can
    // treat the file as absent and start fresh, matching this function's
    // documented contract.
    return null
  }
}
