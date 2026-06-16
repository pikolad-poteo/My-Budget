// Playwright configuration for My Budget end-to-end tests.
// E2E tests run against a real local server and verify the main user flows through the browser UI.
// A single Chromium worker is used to keep database-backed CRUD scenarios deterministic.

const { defineConfig, devices } = require('@playwright/test');

// The port can be overridden in CI or local runs without changing the config file.
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000
  },
  // Database-backed E2E tests are kept sequential to avoid one test changing records while another test is reading them.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry'
  },
  // Playwright starts the application automatically unless a reusable local server is already running.
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PORT),
      SESSION_SECRET: process.env.SESSION_SECRET || 'playwright-test-session-secret'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
