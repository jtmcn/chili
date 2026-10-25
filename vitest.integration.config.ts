import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/support/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/integration/setup.ts'],
    // Every file calls resetDb() on the same database.
    fileParallelism: false,
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
