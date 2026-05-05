import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetchManifest, ManifestFetchError } from '../../src/manifest/fetcher.js'

describe('fetchManifest', () => {
  const tmpDir = join(tmpdir(), 'promptregistry-test-' + Date.now())

  it('fetches from a local file path', async () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'manifest.json')
    const manifest = {
      'manifest-format-version': '1',
      prompts: [
        { name: 'greeting', version: 'v1', template: 'Hello {{name}}' },
      ],
    }
    writeFileSync(path, JSON.stringify(manifest))

    const result = await fetchManifest(path)
    expect(result.manifest.prompts[0].name).toBe('greeting')
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.url).toBe(path)
  })

  it('throws not-found for missing local file', async () => {
    await expect(fetchManifest(join(tmpDir, 'missing.json'))).rejects.toThrow(ManifestFetchError)
    await expect(fetchManifest(join(tmpDir, 'missing.json'))).rejects.toThrow('not found')
  })

  it('throws malformed-json for invalid JSON', async () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'bad.json')
    writeFileSync(path, 'not json')

    await expect(fetchManifest(path)).rejects.toThrow(ManifestFetchError)
    await expect(fetchManifest(path)).rejects.toThrow('not valid JSON')
  })

  it('throws invalid-manifest for bad schema', async () => {
    mkdirSync(tmpDir, { recursive: true })
    const path = join(tmpDir, 'bad-manifest.json')
    writeFileSync(path, JSON.stringify({ 'manifest-format-version': '2', prompts: [] }))

    await expect(fetchManifest(path)).rejects.toThrow(ManifestFetchError)
    await expect(fetchManifest(path)).rejects.toThrow('Invalid manifest')
  })

  it('produces deterministic hash for identical content', async () => {
    mkdirSync(tmpDir, { recursive: true })
    const path1 = join(tmpDir, 'manifest1.json')
    const path2 = join(tmpDir, 'manifest2.json')
    const content = JSON.stringify({
      'manifest-format-version': '1',
      prompts: [{ name: 'greeting', version: 'v1', template: 'Hello {{name}}' }],
    })
    writeFileSync(path1, content)
    writeFileSync(path2, content)

    const result1 = await fetchManifest(path1)
    const result2 = await fetchManifest(path2)
    expect(result1.hash).toBe(result2.hash)
  })

  describe('HTTP fetch hardening', () => {
    const fetchMock = vi.fn()
    const originalFetch = globalThis.fetch

    beforeEach(() => {
      fetchMock.mockReset()
      globalThis.fetch = fetchMock as unknown as typeof fetch
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    function jsonResponse(body: string, headers: Record<string, string> = {}): Response {
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(body, 'utf-8')),
          ...headers,
        },
      })
    }

    it('rejects responses larger than the size cap (declared content-length)', async () => {
      const body = JSON.stringify({
        'manifest-format-version': '1',
        prompts: [{ name: 'g', version: 'v1', template: 'x' }],
      })
      fetchMock.mockResolvedValueOnce(jsonResponse(body, { 'content-length': '20000000' }))

      await expect(
        fetchManifest('https://example.com/manifest.json', { maxBytes: 1024 }),
      ).rejects.toThrow(/too large/i)
    })

    it('rejects non-JSON content types', async () => {
      const body = JSON.stringify({
        'manifest-format-version': '1',
        prompts: [{ name: 'g', version: 'v1', template: 'x' }],
      })
      fetchMock.mockResolvedValueOnce(jsonResponse(body, { 'content-type': 'text/html; charset=utf-8' }))

      await expect(
        fetchManifest('https://example.com/manifest.json'),
      ).rejects.toThrow(/Content-Type/)
    })

    it('accepts well-formed responses', async () => {
      const body = JSON.stringify({
        'manifest-format-version': '1',
        prompts: [{ name: 'g', version: 'v1', template: 'Hello' }],
      })
      fetchMock.mockResolvedValueOnce(jsonResponse(body))

      const result = await fetchManifest('https://example.com/manifest.json')
      expect(result.manifest.prompts[0].name).toBe('g')
    })

    it('translates non-200 statuses into network-error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
      await expect(fetchManifest('https://example.com/manifest.json')).rejects.toThrow(/Unexpected status 500/)
    })
  })

  // Cleanup
  it('cleanup', () => {
    rmSync(tmpDir, { recursive: true, force: true })
  })
})
