import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000, // die 15-Minuten-Einheit setzt ihr eigenes Limit
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', locale: 'de-DE' },
  projects: [
    { name: 'laptop-1280x800', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'fullhd-1920x1080', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
})
