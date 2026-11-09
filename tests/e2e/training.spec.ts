import { expect, test, type Page } from '@playwright/test'

const DEBOUNCE = 450 // Entprellung (400 ms) respektieren

/** Kein Scrollbereich, und kein Knopf ragt aus dem Bildschirm. */
async function expectFits(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const scrollers = [...document.querySelectorAll<HTMLElement>('main *')]
      .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
      .map((el) => el.className)
    const bottom = Math.max(0, ...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom))
    const right = Math.max(0, ...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().right))
    return { pageScroll: doc.scrollHeight > innerHeight + 1, scrollers, bottom, right, h: innerHeight, w: innerWidth }
  })
  expect(r.pageScroll, `Seite scrollt bei ${where}`).toBe(false)
  expect(r.scrollers, `Scrollbereich bei ${where}`).toEqual([])
  expect(r.bottom, `Knopf unten abgeschnitten bei ${where}`).toBeLessThanOrEqual(r.h)
  expect(r.right, `Knopf rechts abgeschnitten bei ${where}`).toBeLessThanOrEqual(r.w)
}

/** Antwortflächen ≥ 96 × 280 px. */
async function expectAnswerSizes(page: Page, where: string) {
  const boxes = await page.locator('[data-testid^="answer-"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  for (const b of boxes) {
    expect(b.height, `Höhe bei ${where}`).toBeGreaterThanOrEqual(96)
    expect(b.width, `Breite bei ${where}`).toBeGreaterThanOrEqual(280)
  }
}

async function createProfile(page: Page, name: string) {
  await page.getByRole('button', { name: 'Neues Profil' }).click()
  // Die Begleitperson tippt den Namen – einziger Tastaturschritt, nicht im Training
  await page.getByLabel('Rufname').fill(name)
  await page.waitForTimeout(DEBOUNCE)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.waitForTimeout(DEBOUNCE)
}

test('eine 15-Minuten-Einheit läuft nur mit der Maus durch', async ({ page }, info) => {
  test.setTimeout(180_000)
  const dir = `test-results/screens/${info.project.name}`
  await page.clock.install()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guten Tag! Wer trainiert heute?' })).toBeVisible()
  await createProfile(page, 'Maria')
  await expectFits(page, 'Start')
  await page.screenshot({ path: `${dir}/01-start.png` })

  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await expect(page.getByRole('heading', { name: 'Schön, dass Sie da sind, Maria.' })).toBeVisible()
  await expect(page.getByText('Heute üben wir etwa 15 Minuten.')).toBeVisible()
  await page.screenshot({ path: `${dir}/02-greeting.png` })
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()

  const seen = new Set<string>()
  const shot = async (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    await page.screenshot({ path: `${dir}/task-${key}.png` })
  }

  let tasks = 0
  let breaks = 0
  for (let step = 0; step < 400; step++) {
    await page.waitForTimeout(DEBOUNCE)
    if (await page.getByTestId('done').isVisible()) break

    if (await page.getByTestId('continue').isVisible()) {
      breaks++
      if (breaks === 1) await page.screenshot({ path: `${dir}/10-break.png` })
      await expectFits(page, 'Zwischenbildschirm')
      await page.getByTestId('continue').click()
      continue
    }

    const screen = page.locator('.task-screen')
    await expect(screen).toBeVisible()
    const exercise = (await screen.getAttribute('data-exercise'))!

    if ((await screen.getAttribute('data-phase')) === 'memorize') {
      await shot(`${exercise}-memorize`)
      await expectFits(page, `${exercise} einprägen`)
      await page.getByTestId('memorized').click()
      await page.waitForTimeout(DEBOUNCE)
    }

    await shot(exercise)
    await expectFits(page, exercise)
    await expectAnswerSizes(page, exercise)

    const open = () => page.locator('[data-testid^="answer-"]:not([disabled]):not([aria-pressed="true"])')
    const multi = await page.getByTestId('submit').isVisible()
    if (multi) {
      await open().nth(0).click(); await page.waitForTimeout(DEBOUNCE)
      await open().nth(1).click(); await page.waitForTimeout(DEBOUNCE)
      await page.getByTestId('submit').click()
    } else {
      await open().nth(0).click()
    }
    await page.waitForTimeout(DEBOUNCE)

    // Nach einem Fehler: Hinweis, nochmal versuchen
    if ((await screen.getAttribute('data-phase')) === 'answer') {
      await expect(page.getByText('Schauen Sie noch einmal genau hin.')).toBeVisible()
      await shot(`${exercise}-hint`)
      await expectFits(page, `${exercise} Hinweis`)
      if (multi) {
        await open().nth(0).click(); await page.waitForTimeout(DEBOUNCE)
        await page.getByTestId('submit').click()
      } else {
        await open().nth(0).click()
      }
      await page.waitForTimeout(DEBOUNCE)
    }

    const final = (await screen.getAttribute('data-phase'))!
    expect(['correct', 'solution']).toContain(final)
    await shot(`${exercise}-${final}`)
    await expectFits(page, `${exercise} ${final}`)
    await page.clock.fastForward(40_000) // jede Aufgabe dauert 40 s
    await page.getByTestId('next').click()
    tasks++
  }

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
  await page.getByRole('button', { name: 'Los geht’s' }).click()
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
