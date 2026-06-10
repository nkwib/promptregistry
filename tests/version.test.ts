import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { version } from '../src/version'

/**
 * The CLI advertises `src/version.ts` via `promptregistry --version`. It must
 * track package.json, otherwise the binary under-reports its own version (the
 * source of a prior 0.1.0-vs-0.2.0 drift).
 */
describe('version', () => {
  it('matches the version in package.json', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(here, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }
    expect(version).toBe(pkg.version)
  })
})
