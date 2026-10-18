import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Unit and component tests only; e2e/ is Playwright's.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
  },
})
