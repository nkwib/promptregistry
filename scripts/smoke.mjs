/**
 * Post-build smoke test.
 *
 * Vitest aliases the package name to `src/*`, so the build output is never
 * exercised by the test suite. This script loads the actual `dist/` artifacts
 * the way a consumer would — ESM `import` and CJS `require` of both entry
 * points — and asserts the key exports resolve. It runs in `prepublishOnly`
 * after `build`, so a broken bundle can never ship.
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(import.meta.url)

const failures = []

function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`ok   - ${label}`)
    })
    .catch((error) => {
      failures.push({ label, error })
      console.error(`FAIL - ${label}: ${error instanceof Error ? error.message : String(error)}`)
    })
}

await check('import ./dist/index.js (types-only entry, loads cleanly)', async () => {
  const mod = await import(join(root, 'dist/index.js'))
  if (typeof mod !== 'object' || mod === null) {
    throw new Error('index.js did not resolve to a module namespace')
  }
})

await check('import ./dist/runtime.js exports compile()', async () => {
  const mod = await import(join(root, 'dist/runtime.js'))
  if (typeof mod.compile !== 'function') {
    throw new Error('runtime.js does not export a compile() function')
  }
  // Exercise it end to end so a broken runtime fails the smoke test.
  const tpl = mod.compile('Hello {{name}}', { open: '{{', close: '}}' })
  const out = tpl.with({ name: 'world' })
  if (out !== 'Hello world') {
    throw new Error(`compile().with() rendered "${out}", expected "Hello world"`)
  }
})

await check('require ./dist/index.cjs (types-only entry, loads cleanly)', async () => {
  const mod = require(join(root, 'dist/index.cjs'))
  if (typeof mod !== 'object' || mod === null) {
    throw new Error('index.cjs did not resolve to an object')
  }
})

await check('require ./dist/runtime.cjs exports compile()', async () => {
  const mod = require(join(root, 'dist/runtime.cjs'))
  if (typeof mod.compile !== 'function') {
    throw new Error('runtime.cjs does not export a compile() function')
  }
  const tpl = mod.compile('Hi {{who}}', { open: '{{', close: '}}' })
  const out = tpl.with({ who: 'there' })
  if (out !== 'Hi there') {
    throw new Error(`compile().with() rendered "${out}", expected "Hi there"`)
  }
})

if (failures.length > 0) {
  console.error(`\nSmoke test failed: ${failures.length} check(s) did not pass.`)
  process.exit(1)
}

console.log('\nSmoke test passed.')
