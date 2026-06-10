/**
 * Manifest fetcher — supports GitHub raw, release assets, and public buckets.
 */

import { readFileSync } from 'node:fs'
import { validateManifest, type Manifest } from './schema.js'
import { sha256 } from './hash.js'

export interface FetchedManifest {
  /** Raw bytes of the manifest JSON */
  bytes: Buffer
  /** Parsed and validated manifest */
  manifest: Manifest
  /**
   * SHA-256 over the raw manifest bytes (byte-integrity gate). This is a hash
   * of the exact bytes served — NOT a canonicalized/normalized form. Any
   * whitespace or key-order change to the remote manifest flips the hash and
   * trips `hash-drift` by design: the lockfile pins the bytes you reviewed.
   */
  hash: string
  /** Original URL */
  url: string
}

export class ManifestFetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'network-error'
      | 'not-found'
      | 'malformed-json'
      | 'invalid-manifest'
      | 'unsupported-url'
      | 'too-large'
      | 'wrong-content-type',
  ) {
    super(message)
    this.name = 'ManifestFetchError'
  }
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTABLE_JSON_TYPES = ['application/json', 'text/json', 'text/plain']

export interface FetchManifestOptions {
  /** Maximum allowed size of the response body, in bytes. Defaults to 10 MiB. */
  maxBytes?: number
  /** Skip Content-Type validation (e.g. for tests or local fixtures). */
  skipContentTypeCheck?: boolean
}

export async function fetchManifest(
  url: string,
  options: FetchManifestOptions = {},
): Promise<FetchedManifest> {
  // Local file path
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return fetchFromFile(url)
  }

  // Parse hostname / pathname so attacker-supplied URLs like
  // `https://evil.com/raw.githubusercontent.com/...` cannot impersonate trusted
  // sources via substring match.
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ManifestFetchError(`Invalid URL: ${url}`, 'unsupported-url')
  }
  const hostname = parsed.hostname.toLowerCase()
  const pathname = parsed.pathname

  // GitHub raw
  if (hostname === 'raw.githubusercontent.com') {
    return fetchFromHttp(url, { expectedStatus: 200, ...options })
  }

  // GitHub release asset
  if (hostname === 'github.com' && pathname.includes('/releases/download/')) {
    return fetchFromHttp(url, { expectedStatus: 200, followRedirects: true, ...options })
  }

  // Public bucket (R2 / S3 / any HTTPS)
  if (url.startsWith('https://')) {
    return fetchFromHttp(url, { expectedStatus: 200, ...options })
  }

  throw new ManifestFetchError(`Unsupported URL: ${url}`, 'unsupported-url')
}

async function fetchFromFile(filePath: string): Promise<FetchedManifest> {
  try {
    const bytes = readFileSync(filePath)
    return parseManifestBytes(bytes, filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ManifestFetchError(`File not found: ${filePath}`, 'not-found')
    }
    if (error instanceof ManifestFetchError) throw error
    throw new ManifestFetchError(`Failed to read file: ${String(error)}`, 'network-error')
  }
}

interface HttpFetchOptions extends FetchManifestOptions {
  expectedStatus: number
  followRedirects?: boolean
}

async function fetchFromHttp(url: string, options: HttpFetchOptions): Promise<FetchedManifest> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES

  try {
    const response = await fetch(url, {
      redirect: options.followRedirects ? 'follow' : 'manual',
    })

    if (response.status === 404) {
      throw new ManifestFetchError(`Not found: ${url}`, 'not-found')
    }

    if (response.status !== options.expectedStatus) {
      throw new ManifestFetchError(
        `Unexpected status ${response.status} for ${url}`,
        'network-error',
      )
    }

    if (!options.skipContentTypeCheck) {
      const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
      const baseType = contentType.split(';')[0].trim()
      if (baseType && !ACCEPTABLE_JSON_TYPES.includes(baseType)) {
        throw new ManifestFetchError(
          `Unexpected Content-Type "${contentType}" for ${url} (expected JSON)`,
          'wrong-content-type',
        )
      }
    }

    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new ManifestFetchError(
        `Manifest too large: ${declaredLength} bytes exceeds limit of ${maxBytes}`,
        'too-large',
      )
    }

    const bytes = await readBodyWithCap(response, maxBytes)
    return parseManifestBytes(bytes, url)
  } catch (error) {
    if (error instanceof ManifestFetchError) {
      throw error
    }
    throw new ManifestFetchError(`Network error: ${String(error)}`, 'network-error')
  }
}

async function readBodyWithCap(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    const fallback = Buffer.from(await response.arrayBuffer())
    if (fallback.byteLength > maxBytes) {
      throw new ManifestFetchError(
        `Manifest too large: ${fallback.byteLength} bytes exceeds limit of ${maxBytes}`,
        'too-large',
      )
    }
    return fallback
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    if (!value) continue
    received += value.byteLength
    if (received > maxBytes) {
      try { await reader.cancel() } catch { /* ignore */ }
      throw new ManifestFetchError(
        `Manifest too large: exceeded limit of ${maxBytes} bytes during streaming`,
        'too-large',
      )
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

function parseManifestBytes(bytes: Buffer, url: string): FetchedManifest {
  let data: unknown
  try {
    data = JSON.parse(bytes.toString('utf-8'))
  } catch {
    throw new ManifestFetchError('Response is not valid JSON', 'malformed-json')
  }

  // Hash the raw bytes as served (byte-integrity gate), not a normalized
  // form. Reformatting the remote JSON (whitespace, key order) intentionally
  // counts as drift — the lockfile pins the exact bytes that were reviewed.
  const hash = sha256(bytes)

  try {
    const manifest = validateManifest(data)
    return { bytes, manifest, hash, url }
  } catch (error) {
    throw new ManifestFetchError(
      `Invalid manifest: ${error instanceof Error ? error.message : String(error)}`,
      'invalid-manifest',
    )
  }
}

