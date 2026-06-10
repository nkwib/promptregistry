import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/runtime.ts', 'src/cli/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Keep heavy or CJS-only deps out of the bundle. typescript in particular
  // uses dynamic require() internally and can't be bundled cleanly into ESM.
  external: ['typescript', 'cac', 'zod'],
  target: 'node20',
  splitting: false,
  // Keep the `node:` prefix on built-in imports. tsup/esbuild strips it by
  // default, leaving bare `require("fs")` / `from "crypto"` in dist, which
  // weakens the built-in/userland distinction (and breaks runtimes that only
  // resolve the prefixed form). We author with `node:` everywhere, so preserve
  // it in the output.
  removeNodeProtocol: false,
})
