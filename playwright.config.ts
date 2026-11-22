import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the browser version (`npm run test:e2e`).
 * WebKit is the engine the Mac app runs on, so both are tested.
 */
const PAGES_SPEC = /pagesSubpath\.spec\.ts/
const PAGES_URL = 'http://localhost:4173/rondel-it/'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: PAGES_SPEC, use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', testIgnore: PAGES_SPEC, use: { ...devices['Desktop Safari'] } },
    // The GitHub Pages build, served from /rondel-it/ like the published demo.
    { name: 'pages', testMatch: PAGES_SPEC, use: { ...devices['Desktop Chrome'], baseURL: PAGES_URL } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:1420',
      // Each test gets a fresh browser profile, so a running dev server (and
      // your own data in your normal browser) is never touched.
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx vite build --outDir dist-pages && npx vite preview --outDir dist-pages --port 4173 --strictPort',
      env: { PAGES_BASE: '/rondel-it/' },
      url: PAGES_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
