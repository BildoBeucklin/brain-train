import { expect, test, type Page } from '@playwright/test'
import { answerByTapping, createProfile, DEBOUNCE, runSession } from './helpers'

const bar = (page: Page) => page.getByTestId('companion-bar')

async function click(page: Page, testId: string) {
  await page.getByTestId(testId).click()
  await page.waitForTimeout(DEBOUNCE)
}

test('dieselbe Einheit betreut: Begleitleiste mit allen Funktionen', async ({ page }, info) => {
  test.setTimeout(300_000)
  const dir = `test-results/screens/${info.project.name}`
  const seen = new Set<string>()
  const shot = async (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    await page.screenshot({ path: `${dir}/assisted-${key}.png` })
  }

  await page.clock.install()
  await page.goto('/')
  await createProfile(page, 'Maria')
  await expect(page.getByRole('switch')).toHaveAttribute('data-state', 'checked') // neues Profil: betreut
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()
  await page.waitForTimeout(DEBOUNCE)
  await expect(bar(page)).toBeVisible()
  expect((await bar(page).boundingBox())!.height).toBe(72)

  // Reihum alle Funktionen der Leiste nutzen
  const used = new Set<string>()
  const { tasks, breaks } = await runSession(page, {
    shot,
    onTask: async ({ open, index }) => {
      await expect(bar(page)).toBeVisible()
      if (open) {
        used.add('offen')
        await click(page, 'cb-right')
        return 'done'
      }
      switch (index % 7) {
        case 0: { // Tipp
          await click(page, 'cb-tip')
          await expect(page.getByTestId('cb-tip-text')).toBeVisible()
          await shot('tip')
          await page.keyboard.press('Escape')
          used.add('tipp')
          await answerByTapping(page)
          return 'done'
        }
        case 1: { // Lösung ansehen, solange gedrückt
          const peek = page.getByTestId('cb-peek')
          const box = (await peek.boundingBox())!
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.down()
          await expect(page.getByTestId('cb-solution')).toContainText('Lösung:')
          await shot('peek')
          await page.mouse.up()
          await expect(page.getByTestId('cb-solution')).toHaveCount(0)
          used.add('lösung')
          await click(page, 'cb-right')
          return 'done'
        }
        case 2: // Hinweis geben
          if (await page.getByTestId('cb-hint').isEnabled()) {
            await click(page, 'cb-hint')
            await expect(page.getByText('Schauen Sie noch einmal genau hin.')).toBeVisible()
            await shot('hint')
            used.add('hinweis')
          }
          await answerByTapping(page)
          return 'done'
        case 3: // Nicht gewusst
          await click(page, 'cb-unknown')
          used.add('nicht gewusst')
          return 'done'
        case 4: // Überspringen
          await click(page, 'cb-skip')
          used.add('überspringen')
          return 'skipped'
        case 5: { // Niveau + und Festhalten
          const before = Number(await page.getByTestId('cb-level').inputValue())
          if (before < 10) {
            await click(page, 'cb-level-up')
            await expect(page.getByTestId('cb-level')).toHaveValue(String(before + 1))
          }
          await click(page, 'cb-lock')
          await expect(page.getByTestId('cb-lock')).toHaveAttribute('data-state', 'on')
          await click(page, 'cb-lock')
          used.add('niveau')
          await click(page, 'cb-right')
          return 'done'
        }
        default: // Tasten H und S für die Begleitperson
          await page.keyboard.press('h')
          await page.waitForTimeout(DEBOUNCE)
          used.add('taste h')
          await page.keyboard.press('s')
          await page.waitForTimeout(DEBOUNCE)
          used.add('taste s')
          return 'skipped'
      }
    },
  })

  await expect(page.getByRole('heading', { name: /Sie haben heute 1[5-9] Minuten trainiert\./ })).toBeVisible()
  expect(tasks).toBeGreaterThanOrEqual(23)
  expect(breaks).toBeGreaterThanOrEqual(3)
  for (const f of ['tipp', 'lösung', 'nicht gewusst', 'überspringen', 'niveau', 'taste h', 'taste s']) expect(used, f).toContain(f)
})

test('Begleitung per 2 s Druck ein- und ausschalten; Pause, Taste P und Beenden', async ({ page }) => {
  await page.goto('/')
  await createProfile(page, 'Hans')
  await page.getByRole('switch').click() // allein starten
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()
  await expect(page.locator('.task-screen')).toBeVisible()
  await expect(bar(page)).toHaveCount(0)

  const toggle = page.getByTestId('help-toggle')
  const box = (await toggle.boundingBox())!
  // kurzer Druck schaltet nicht um
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up()
  await expect(bar(page)).toHaveCount(0)
  // 2 Sekunden halten schaltet ein
  await page.mouse.down(); await page.waitForTimeout(2200); await page.mouse.up()
  await expect(bar(page)).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  // Taste P = Pause
  await page.keyboard.press('p')
  await expect(page.getByRole('heading', { name: 'Pause' })).toBeVisible()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('resume').click()
  await page.waitForTimeout(DEBOUNCE)

  // Pause über die Leiste
  await click(page, 'cb-pause')
  await expect(page.getByRole('heading', { name: 'Pause' })).toBeVisible()
  await click(page, 'resume')

  // Beenden mit Rückfrage
  await click(page, 'cb-end')
  await expect(page.getByRole('alertdialog')).toContainText('Einheit beenden?')
  await page.getByRole('button', { name: 'Weiter trainieren' }).click()
  await expect(page.locator('.task-screen')).toBeVisible()
  await page.waitForTimeout(DEBOUNCE)
  await click(page, 'cb-end')
  await page.getByTestId('cb-end-confirm').click()
  await expect(page.getByRole('heading', { name: /Sie haben heute \d+ Minuten? trainiert\./ })).toBeVisible()

  // wieder ausschalten wirkt beim nächsten Mal: Startbildschirm merkt sich den Modus
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('done').click()
  await expect(page.getByRole('switch')).toHaveAttribute('data-state', 'checked')
})
