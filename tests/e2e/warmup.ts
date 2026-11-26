import { chromium } from '@playwright/test'

/** Lädt die App einmal vorab, damit Vite die Abhängigkeiten bündelt, bevor die Tests starten. */
export default async function warmup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const path of ['/', '/#/vorschau?exercise=memory&level=9', '/#/verwaltung']) {
    await page.goto(`http://localhost:5199${path}`, { timeout: 180_000 })
    await page.waitForLoadState('networkidle', { timeout: 180_000 })
  }
  await browser.close()
}
