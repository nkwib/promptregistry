/**
 * Shared sha256 helper for manifest content hashing.
 *
 * Hashes the raw manifest bytes as-is (byte-integrity gate) — there is no
 * canonicalization or normalization step. Whitespace or key-order changes to
 * the manifest therefore change the hash and count as drift by design.
 *
 * Used by both the fetcher (for remote/local manifest content) and `init`
 * (when bootstrapping a starter `prompt-lock.json` against the freshly
 * scaffolded `manifest.json`).
 */

import { createHash } from 'node:crypto'

export function sha256(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
  return createHash('sha256').update(buf).digest('hex')
}
