import { expect, test } from '@playwright/test'

// Bildergalerie aller Übungen auf Niveau 2, 5 und 9 – zur Sichtprüfung und als Layout-Test.
const EXERCISES = ['stroop', 'upsideDown', 'reverse', 'proverbs', 'oddOneOut', 'opposites', 'wordFinding', 'memory', 'math']

for (const exercise of EXERCISES) {
  for (const level of [2, 5, 9, 10]) {
    test(`${exercise} Niveau ${level} passt auf den Bildschirm`, async ({ page }, info) => {
      await page.goto(`/#/vorschau?exercise=${exercise}&level=${level}`)
      const screen = page.locator('.task-screen')
      await expect(screen).toBeVisible()
      const dir = `test-results/gallery/${info.project.name}`
      if ((await screen.getAttribute('data-phase')) === 'memorize') {
        await page.screenshot({ path: `${dir}/${exercise}-${level}-a-memorize.png` })
        await page.getByTestId('memorized').click()
        await page.waitForTimeout(450)
      }
      await page.screenshot({ path: `${dir}/${exercise}-${level}-b-task.png` })
      // Lösung erzwingen: zweimal falsch
      for (let i = 0; i < 2; i++) {
        const wrong = page.locator('[data-testid^="answer-"]:not([disabled]):not([aria-pressed="true"])')
        if (await page.getByTestId('submit').isVisible()) {
          await wrong.nth(0).click(); await page.waitForTimeout(450)
          await page.getByTestId('submit').click()
        } else await wrong.nth(0).click()
        await page.waitForTimeout(450)
        if ((await screen.getAttribute('data-phase')) !== 'answer') break
      }
      await page.screenshot({ path: `${dir}/${exercise}-${level}-c-done.png` })
      const fits = await page.evaluate(() => Math.max(...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom)) <= innerHeight
        && Math.max(...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().right)) <= innerWidth)
      expect(fits).toBe(true)
      for (const b of await page.locator('[data-testid^="answer-"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
        expect(b.height).toBeGreaterThanOrEqual(96)
        expect(b.width).toBeGreaterThanOrEqual(280)
      }
    })
  }
}
