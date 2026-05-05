import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      'promptregistry/runtime': resolve(__dirname, 'src/runtime.ts'),
      'promptregistry': resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
