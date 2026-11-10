import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/warmup.ts', // Vite bündelt beim ersten Aufruf vor – einmal vorab laden
  timeout: 60_000, // die 15-Minuten-Einheit setzt ihr eigenes Limit
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5199', locale: 'de-DE' },
  projects: [
    { name: 'laptop-1280x800', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'fullhd-1920x1080', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  // eigener Port, damit nie ein fremder Dev-Server (z. B. eines anderen Projekts auf 5173) getestet wird
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: false, timeout: 60_000 },
})
