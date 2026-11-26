import { expect, type Page } from '@playwright/test'

export const DEBOUNCE = 450 // Entprellung (400 ms) respektieren

/** Kein Scrollbereich, und kein Knopf ragt aus dem Bildschirm. */
export async function expectFits(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const scrollers = [...document.querySelectorAll<HTMLElement>('main *')]
      .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
      .map((el) => el.className)
    const rects = [...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
    return {
      pageScroll: doc.scrollHeight > innerHeight + 1,
      scrollers,
      bottom: Math.max(0, ...rects.map((b) => b.bottom)),
      right: Math.max(0, ...rects.map((b) => b.right)),
      h: innerHeight,
      w: innerWidth,
    }
  })
  expect(r.pageScroll, `Seite scrollt bei ${where}`).toBe(false)
  expect(r.scrollers, `Scrollbereich bei ${where}`).toEqual([])
  expect(r.bottom, `Knopf unten abgeschnitten bei ${where}`).toBeLessThanOrEqual(r.h)
  expect(r.right, `Knopf rechts abgeschnitten bei ${where}`).toBeLessThanOrEqual(r.w)
}

/** Antwortflächen ≥ 96 × 280 px. */
export async function expectAnswerSizes(page: Page, where: string) {
  const boxes = await page.locator('[data-testid^="answer-"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  for (const b of boxes) {
    expect(b.height, `Höhe bei ${where}`).toBeGreaterThanOrEqual(96)
    expect(b.width, `Breite bei ${where}`).toBeGreaterThanOrEqual(280)
  }
}

export const TEST_PIN = '2580'

/** PIN über den Bildschirm-Ziffernblock eingeben. */
export async function typePin(page: Page, pin = TEST_PIN) {
  await page.waitForTimeout(DEBOUNCE) // vorheriger Klick darf die erste Ziffer nicht entprellen
  for (const d of pin) {
    await page.getByTestId(`pin-key-${d}`).click()
    await page.waitForTimeout(DEBOUNCE)
  }
}

/** Öffnet die Verwaltung; legt beim ersten Mal die PIN fest. */
export async function openAdmin(page: Page) {
  await page.getByTestId('to-admin').click()
  const create = page.getByRole('heading', { name: 'PIN festlegen' })
  const enter = page.getByRole('heading', { name: 'Verwaltung' })
  await expect(create.or(enter)).toBeVisible()
  if (await create.isVisible()) {
    await typePin(page)
    await expect(page.getByRole('heading', { name: 'PIN wiederholen' })).toBeVisible()
  }
  await typePin(page)
  await expect(page.getByTestId('tab-profile')).toBeVisible()
}

export async function leaveAdmin(page: Page) {
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('leave-admin').click()
  await page.waitForTimeout(DEBOUNCE)
  await expect(page.getByRole('heading', { name: 'Guten Tag! Wer trainiert heute?' })).toBeVisible()
}

/** Profil über die Verwaltung anlegen (Begleitperson tippt den Namen – nicht im Training). */
export async function createProfile(page: Page, name: string) {
  await openAdmin(page)
  await page.getByTestId('add-profile').click()
  await page.getByLabel('Rufname').fill(name)
  await page.waitForTimeout(DEBOUNCE)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await expect(page.getByTestId('profile-row').filter({ hasText: name })).toBeVisible()
  await leaveAdmin(page)
  await page.getByRole('button', { name }).click()
  await page.waitForTimeout(DEBOUNCE)
}

export const openAnswers = (page: Page) =>
  page.locator('[data-testid^="answer-"]:not([disabled]):not([aria-pressed="true"])')

/** Beantwortet die aktuelle Aufgabe per Antippen (erste freie Antwort; bei Fehler nochmal). */
export async function answerByTapping(page: Page, onHint?: () => Promise<void>) {
  const screen = page.locator('.task-screen')
  // Eigene Bedienung statt Antwortflächen: Spiegelbilder (Bilder antippen) und Einkaufen (Ware + Anzahl)
  if ((await screen.getAttribute('data-exercise')) === 'mirror') {
    await page.getByTestId('mirror-0').click(); await page.waitForTimeout(DEBOUNCE)
    await page.getByTestId('submit').click(); await page.waitForTimeout(DEBOUNCE)
    return
  }
  if (await page.locator('[data-testid^="product-"]').count()) {
    for (let i = 0; i < 3 && (await screen.getAttribute('data-phase')) === 'answer'; i++) {
      await page.locator('[data-testid^="product-"]').nth(i).click()
      await page.locator('[data-testid^="count-"]:not([disabled])').first().click(); await page.waitForTimeout(DEBOUNCE)
      await page.getByTestId('submit').click(); await page.waitForTimeout(DEBOUNCE)
      if (i === 0 && (await screen.getAttribute('data-phase')) === 'answer') await onHint?.()
    }
    return
  }
  const multi = await page.getByTestId('submit').isVisible()
  if (multi) {
    await openAnswers(page).nth(0).click(); await page.waitForTimeout(DEBOUNCE)
    await openAnswers(page).nth(1).click(); await page.waitForTimeout(DEBOUNCE)
    await page.getByTestId('submit').click()
  } else {
    await openAnswers(page).nth(0).click()
  }
  await page.waitForTimeout(DEBOUNCE)
  if ((await screen.getAttribute('data-phase')) === 'answer') {
    await expect(page.getByText('Schauen Sie noch einmal genau hin.')).toBeVisible()
    await onHint?.()
    if (multi) {
      await openAnswers(page).nth(0).click(); await page.waitForTimeout(DEBOUNCE)
      await page.getByTestId('submit').click()
    } else {
      await openAnswers(page).nth(0).click()
    }
    await page.waitForTimeout(DEBOUNCE)
  }
}

export interface SessionOptions {
  /** wird für jede Aufgabe aufgerufen; muss die Aufgabe abschließen (Phase correct/solution) oder überspringen */
  onTask: (ctx: { exercise: string; index: number; open: boolean }) => Promise<'done' | 'skipped'>
  shot?: (key: string) => Promise<void>
  msPerTask?: number
}

/** Spielt eine ganze Einheit nur mit Klicks durch; liefert die Zahl der Aufgaben und Zwischenbildschirme. */
export async function runSession(page: Page, opts: SessionOptions) {
  let tasks = 0
  let breaks = 0
  for (let step = 0; step < 400; step++) {
    await page.waitForTimeout(DEBOUNCE)
    if (await page.getByTestId('done').isVisible()) break

    if (await page.getByTestId('continue').isVisible()) {
      breaks++
      await opts.shot?.('break')
      await expectFits(page, 'Zwischenbildschirm')
      await page.getByTestId('continue').click()
      continue
    }

    const screen = page.locator('.task-screen')
    await expect(screen).toBeVisible()
    const exercise = (await screen.getAttribute('data-exercise'))!

    if ((await screen.getAttribute('data-phase')) === 'memorize') {
      await opts.shot?.(`${exercise}-memorize`)
      await expectFits(page, `${exercise} einprägen`)
      await page.getByTestId('memorized').click()
      await page.waitForTimeout(DEBOUNCE)
    }

    const open = await page.getByTestId('open-task').isVisible()
    await opts.shot?.(open ? `${exercise}-open` : exercise)
    await expectFits(page, exercise)
    if (!open) await expectAnswerSizes(page, exercise)

    const result = await opts.onTask({ exercise, index: tasks, open })
    tasks++
    await page.clock.fastForward(opts.msPerTask ?? 40_000)
    if (result === 'skipped') continue

    const final = (await screen.getAttribute('data-phase'))!
    expect(['correct', 'solution']).toContain(final)
    await opts.shot?.(`${exercise}-${final}`)
    await expectFits(page, `${exercise} ${final}`)
    await page.getByTestId('next').click()
  }
  return { tasks, breaks }
}
