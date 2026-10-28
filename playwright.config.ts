import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 2, retries: 0,
  timeout: 30000, expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort', port: 4173, reuseExistingServer: false, timeout: 30000 },
});
