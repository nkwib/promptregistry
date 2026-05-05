import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@nkwib/promptregistry/runtime': resolve(__dirname, 'src/runtime.ts'),
      '@nkwib/promptregistry': resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
