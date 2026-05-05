/**
 * Determinism guard for codegen and lockfile re-writes.
 *
 * Issue 004 acceptance: "Re-running codegen on an unchanged manifest produces
 * byte-identical output (no timestamps in body, no map ordering drift)."
 *
 * This test exercises both:
 *   - `codegen()` directly (generated `.ts` files must be byte-stable).
 *   - The `mergePulledAt` helper (lockfile rewrites must preserve `pulled_at`
 *     for entries whose (name, version, content_hash) triple is unchanged).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { codegen } from '../src/codegen/index.js'
import {
  createLockfile,
  mergePulledAt,
  type Lockfile,
  type LockfileEntry,
} from '../src/lockfile/io.js'
import type { Manifest } from '../src/manifest/schema.js'

describe('codegen determinism', () => {
  let tmpDir: string

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

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `promptregistry-determinism-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    )
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('generated .ts files are byte-identical across re-runs', () => {
    const opts = {
      outDir: tmpDir,
      manifestUrl: 'https://example.com/manifest.json',
      manifestHash: 'abc123',
    }

    codegen(manifest, opts)
    const firstSnapshot = snapshotDir(tmpDir)

    // Run again with the same inputs.
    codegen(manifest, opts)
    const secondSnapshot = snapshotDir(tmpDir)

    expect(secondSnapshot).toEqual(firstSnapshot)

    // Spot check: no `// Generated:` line leaked back in.
    for (const [filename, content] of Object.entries(firstSnapshot)) {
      expect(
        content,
        `${filename} must not embed a generation timestamp`,
      ).not.toMatch(/^\/\/ Generated:/m)
    }
  })

  it('mergePulledAt preserves pulled_at for unchanged (name, version, content_hash) triples', () => {
    const original: LockfileEntry = {
      name: 'customer-summary',
      version: 'v1',
      manifest_url: 'https://example.com/manifest.json',
      content_hash: 'abc123',
      pulled_at: '2024-01-01T00:00:00.000Z',
    }
    const existing: Lockfile = createLockfile([original])

    const fresh: LockfileEntry[] = [
      {
        ...original,
        pulled_at: '2026-05-05T12:00:00.000Z', // pretend this is a fresh stamp
      },
    ]

    const merged = mergePulledAt(existing, fresh)
    expect(merged).toHaveLength(1)
    expect(merged[0].pulled_at).toBe('2024-01-01T00:00:00.000Z')
  })

  it('mergePulledAt stamps a new pulled_at when content_hash changes', () => {
    const existing: Lockfile = createLockfile([
      {
        name: 'customer-summary',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'old-hash',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])

    const fresh: LockfileEntry[] = [
      {
        name: 'customer-summary',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'new-hash',
        pulled_at: '2026-05-05T12:00:00.000Z',
      },
    ]

    const merged = mergePulledAt(existing, fresh)
    expect(merged[0].pulled_at).toBe('2026-05-05T12:00:00.000Z')
  })

  it('mergePulledAt stamps a new pulled_at for genuinely new entries', () => {
    const existing: Lockfile = createLockfile([])
    const fresh: LockfileEntry[] = [
      {
        name: 'welcome',
        version: 'v2',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'fresh',
        pulled_at: '2026-05-05T12:00:00.000Z',
      },
    ]
    const merged = mergePulledAt(existing, fresh)
    expect(merged[0].pulled_at).toBe('2026-05-05T12:00:00.000Z')
  })

  it('mergePulledAt with no existing lockfile is a no-op', () => {
    const fresh: LockfileEntry[] = [
      {
        name: 'welcome',
        version: 'v2',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'fresh',
        pulled_at: '2026-05-05T12:00:00.000Z',
      },
    ]
    expect(mergePulledAt(null, fresh)).toEqual(fresh)
  })
})

function snapshotDir(dir: string): Record<string, string> {
  const snap: Record<string, string> = {}
  for (const file of readdirSync(dir).sort()) {
    snap[file] = readFileSync(join(dir, file), 'utf-8')
  }
  return snap
}
