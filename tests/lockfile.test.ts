import { describe, it, expect } from 'vitest'
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readLockfile,
  writeLockfile,
  createLockfile,
  findLockfileEntry,
} from '../src/lockfile/io'

describe('lockfile I/O', () => {
  const tmpDir = join(tmpdir(), 'promptregistry-lockfile-test-' + Date.now())

  it('round-trips a lockfile', () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'prompt-lock.json')
    const lockfile = createLockfile([
      {
        name: 'greeting',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'abc123',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])

    writeLockfile(path, lockfile)
    const read = readLockfile(path)

    expect(read).toEqual(lockfile)
  })

  it('sorts entries deterministically', () => {
    const lockfile = createLockfile([
      {
        name: 'zebra',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'hash1',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'apple',
        version: 'v2',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'hash2',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])

    expect(lockfile.entries[0].name).toBe('apple')
    expect(lockfile.entries[1].name).toBe('zebra')
  })

  it('finds an entry by name and version', () => {
    const lockfile = createLockfile([
      {
        name: 'greeting',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'hash1',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])

    expect(findLockfileEntry(lockfile, 'greeting', 'v1')).toBeDefined()
    expect(findLockfileEntry(lockfile, 'greeting', 'v2')).toBeUndefined()
    expect(findLockfileEntry(lockfile, 'other', 'v1')).toBeUndefined()
  })

  it('produces byte-identical output on re-write', () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'prompt-lock.json')
    const lockfile = createLockfile([
      {
        name: 'greeting',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'abc123',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])

    writeLockfile(path, lockfile)
    const first = readFileSync(path, 'utf-8')

    writeLockfile(path, readLockfile(path))
    const second = readFileSync(path, 'utf-8')

    expect(second).toBe(first)
  })

  it('creates parent directories on write', () => {
    const nestedPath = join(tmpDir, 'deep', 'nested', 'dir', 'prompt-lock.json')
    const lockfile = createLockfile([
      {
        name: 'greeting',
        version: 'v1',
        manifest_url: 'https://example.com/manifest.json',
        content_hash: 'abc123',
        pulled_at: '2024-01-01T00:00:00.000Z',
      },
    ])
    expect(() => writeLockfile(nestedPath, lockfile)).not.toThrow()
    expect(readLockfile(nestedPath)).toEqual(lockfile)
  })

  it('rejects malformed lockfile JSON', () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'malformed-lock.json')
    writeFileSync(path, '{ this is not json')
    expect(() => readLockfile(path)).toThrow()
  })

  it('rejects lockfile missing required fields', () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'incomplete-lock.json')
    writeFileSync(path, JSON.stringify({ 'lockfile-format-version': '1', entries: [{ name: 'x' }] }))
    expect(() => readLockfile(path)).toThrow()
  })

  // Cleanup
  it('cleanup', () => {
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
