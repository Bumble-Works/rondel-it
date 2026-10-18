import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the browser version (`npm run test:e2e`).
 * WebKit is the engine the Mac app runs on, so both are tested.
 */
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',
    // Each test gets a fresh browser profile, so a running dev server (and
    // your own data in your normal browser) is never touched.
    reuseExistingServer: !process.env.CI,
  },
})
