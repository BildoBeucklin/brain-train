import { expect, test } from '@playwright/test'
import { answerByTapping, createProfile, DEBOUNCE, expectFits, runSession } from './helpers'

test('eine 15-Minuten-Einheit läuft allein nur mit der Maus durch', async ({ page }, info) => {
  test.setTimeout(300_000)
  const dir = `test-results/screens/${info.project.name}`
  const seen = new Set<string>()
  const shot = async (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    await page.screenshot({ path: `${dir}/alone-${key}.png` })
  }

  await page.clock.install()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guten Tag! Wer trainiert heute?' })).toBeVisible()
  await createProfile(page, 'Maria')
  await expectFits(page, 'Start')
  // Neues Profil startet mit Begleitung – für diesen Test ausschalten
  await expect(page.getByRole('switch')).toHaveAttribute('data-state', 'checked')
  await page.getByRole('switch').click()
  await page.screenshot({ path: `${dir}/01-start.png` })

  await page.getByRole('button', { name: 'Tägliches Training' }).click()
  await expect(page.getByRole('heading', { name: 'Schön, dass Sie da sind, Maria.' })).toBeVisible()
  await expect(page.getByText('Heute üben wir etwa 15 Minuten.')).toBeVisible()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()

  const { tasks, breaks } = await runSession(page, {
    shot,
    onTask: async ({ exercise }) => {
      await expect(page.getByTestId('companion-bar')).toHaveCount(0) // allein: keine Begleitleiste
      await answerByTapping(page, () => shot(`${exercise}-hint`))
      return 'done'
    },
  })

  await expect(page.getByRole('heading', { name: /Sie haben heute 1[5-9] Minuten trainiert\./ })).toBeVisible()
  await page.screenshot({ path: `${dir}/12-end.png` })
  expect(tasks).toBeGreaterThanOrEqual(23) // 3 Aufwärmen + 4 Blöcke à 5
  expect(breaks).toBeGreaterThanOrEqual(3)
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('done').click()
  await expect(page.getByRole('heading', { name: 'Guten Tag! Wer trainiert heute?' })).toBeVisible()
})

test('Pause und Leerlauf-Nachfrage', async ({ page }, info) => {
  await page.clock.install()
  await page.goto('/')
  await createProfile(page, 'Hans')
  await page.getByRole('button', { name: 'Tägliches Training' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()

  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('pause').click()
  await expect(page.getByRole('heading', { name: 'Pause' })).toBeVisible()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('resume').click()
  await expect(page.locator('.task-screen')).toBeVisible()

  // 2 Minuten ohne Eingabe → freundliche Nachfrage, kein Abbruch
  await page.clock.fastForward(2 * 60_000 + 1000)
  await expect(page.getByRole('heading', { name: 'Möchten Sie weitermachen?' })).toBeVisible()
  await page.screenshot({ path: `test-results/screens/${info.project.name}/11-idle.png` })
  await page.waitForTimeout(DEBOUNCE)
  await page.getByRole('button', { name: 'Ja, weiter' }).click()
  await expect(page.getByRole('heading', { name: 'Möchten Sie weitermachen?' })).toBeHidden()
  await expect(page.locator('.task-screen')).toBeVisible()
})
