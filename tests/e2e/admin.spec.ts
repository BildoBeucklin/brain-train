import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { answerByTapping, createProfile, DEBOUNCE, expectFits, leaveAdmin, openAdmin, typePin } from './helpers'

test('Startbildschirm ohne Profile: Hinweis, kein Anlegen ohne PIN', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('no-profiles')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Neues Profil' })).toHaveCount(0)
  await expectFits(page, 'Start leer')
})

test('PIN festlegen, falsche PIN, Wiederöffnen', async ({ page }, info) => {
  await page.goto('/')
  await page.getByTestId('to-admin').click()
  await expect(page.getByRole('heading', { name: 'PIN festlegen' })).toBeVisible()
  await page.screenshot({ path: `test-results/screens/${info.project.name}/14-pin.png` })
  await typePin(page, '1111')
  await typePin(page, '2222') // stimmt nicht überein
  await expect(page.getByText('Die beiden PINs stimmen nicht überein')).toBeVisible()
  await typePin(page, '2580')
  await typePin(page, '2580')
  await expect(page.getByTestId('tab-profile')).toBeVisible()
  await leaveAdmin(page)

  await page.getByTestId('to-admin').click()
  await expect(page.getByRole('heading', { name: 'Verwaltung' })).toBeVisible()
  await typePin(page, '0000')
  await expect(page.getByText('Die PIN stimmt nicht')).toBeVisible()
  await expect(page.getByTestId('tab-profile')).toHaveCount(0)
  await typePin(page, '2580')
  await expect(page.getByTestId('tab-profile')).toBeVisible()
})

test('Profile anlegen, bearbeiten, löschen', async ({ page }) => {
  await page.goto('/')
  await createProfile(page, 'Maria')
  await openAdmin(page)
  const row = page.getByTestId('profile-row').filter({ hasText: 'Maria' })
  await row.getByRole('button', { name: 'Bearbeiten' }).click()
  await page.getByLabel('Rufname').fill('Marie')
  await page.waitForTimeout(DEBOUNCE)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByTestId('profile-row').filter({ hasText: 'Marie' })).toBeVisible()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('profile-row').filter({ hasText: 'Marie' }).getByRole('button', { name: 'Löschen' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Verlauf dieses Profils')
  await page.getByTestId('confirm-delete').click()
  await expect(page.getByTestId('profile-row')).toHaveCount(0)
  await leaveAdmin(page)
  await expect(page.getByTestId('no-profiles')).toBeVisible()
})

test('eigenen Inhalt anlegen (mit Prüfung), abschalten, Inhalte teilen und einlesen', async ({ page }, info) => {
  await page.goto('/')
  await openAdmin(page)
  await page.getByTestId('tab-inhalte').click()
  await page.getByTestId('ex-opposites').click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('add-item').click()
  const editor = page.getByTestId('item-editor')
  await expect(editor).toBeVisible()

  // ungültig: Lösung unter den falschen Antworten
  await page.getByTestId('f-word').fill('Ost')
  await page.getByTestId('f-opposite').fill('West')
  await page.getByTestId('f-distractors-0').fill('West')
  await page.getByTestId('f-distractors-1').fill('Süd')
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('item-save').click()
  await expect(editor.getByRole('alert').first()).toBeVisible()
  await page.screenshot({ path: `test-results/screens/${info.project.name}/14-editor-error.png` })

  await page.getByTestId('f-distractors-0').fill('Nord')
  await page.getByTestId('f-distractors-2').fill('Mitte')
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('item-save').click()
  await expect(editor).toBeHidden()
  const mine = page.getByTestId('item-list').locator('li').filter({ hasText: 'Ost ↔ West' })
  await expect(mine).toContainText('eigener')

  // abschalten
  await mine.getByRole('switch').click()
  await expect(mine.getByRole('switch')).toHaveAttribute('data-state', 'unchecked')
  await mine.getByRole('switch').click()

  // Inhalte teilen → Download
  await page.getByTestId('tab-einstellungen').click()
  await page.waitForTimeout(DEBOUNCE)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-content').click()])
  expect(download.suggestedFilename()).toMatch(/^Gedaechtnisstunde-Inhalte-\d{4}-\d{2}-\d{2}\.json$/)
  const path = test.info().outputPath('inhalte.json')
  await download.saveAs(path)
  const file = JSON.parse(readFileSync(path, 'utf8'))
  expect(file.kind).toBe('inhalte')
  expect(file.items).toHaveLength(1)

  // dieselbe Datei wieder einlesen → als Duplikat übersprungen
  await page.waitForTimeout(DEBOUNCE)
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByTestId('import').click()])
  await chooser.setFiles(path)
  await expect(page.getByTestId('settings-message')).toContainText('0 Einträge hinzugefügt, 1 schon vorhanden')
})

test('Einstellungen wirken: Einheitslänge, dunkles Design, Sicherungs-Erinnerung', async ({ page }, info) => {
  await page.goto('/')
  await createProfile(page, 'Hans')
  await openAdmin(page)
  await page.getByTestId('tab-einstellungen').click()
  await expect(page.getByTestId('backup-due')).toBeVisible()
  await page.getByTestId('minutes-10').check()
  await page.getByTestId('theme-dark').check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: `test-results/screens/${info.project.name}/14-settings-dark.png`, fullPage: true })

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-all').click()])
  expect(download.suggestedFilename()).toMatch(/Sicherung/)
  await expect(page.getByTestId('backup-due')).toBeHidden()

  await leaveAdmin(page)
  await page.getByRole('button', { name: 'Hans' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByRole('button', { name: 'Tägliches Training' }).click()
  await expect(page.getByText('Heute üben wir etwa 10 Minuten.')).toBeVisible()
  await page.screenshot({ path: `test-results/screens/${info.project.name}/14-greeting-dark.png` })
})

test('Verlauf zeigt Minuten und Niveaus nach einer Einheit, mit Hinweis „kein Test“', async ({ page }, info) => {
  await page.clock.install()
  await page.goto('/')
  await createProfile(page, 'Maria')
  await page.getByRole('switch').click() // allein
  await page.getByRole('button', { name: 'Tägliches Training' }).click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('begin').click()
  // 4 Aufgaben à 90 s (unter der Leerlauf-Grenze von 2 min) = 6 min
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(DEBOUNCE)
    const screen = page.locator('.task-screen')
    if ((await screen.getAttribute('data-phase')) === 'memorize') { await page.getByTestId('memorized').click(); await page.waitForTimeout(DEBOUNCE) }
    await page.clock.fastForward(90_000)
    if ((await screen.getAttribute('data-exercise')) === 'mirror' || await page.locator('[data-testid^="product-"]').count()) {
      await answerByTapping(page)
    } else if (await page.getByTestId('submit').isVisible()) {
      await page.locator('[data-testid^="answer-"]').first().click(); await page.waitForTimeout(DEBOUNCE)
      await page.getByTestId('submit').click(); await page.waitForTimeout(DEBOUNCE)
      if ((await screen.getAttribute('data-phase')) === 'answer') { await page.locator('[data-testid^="answer-"]:not([disabled])').first().click(); await page.waitForTimeout(DEBOUNCE); await page.getByTestId('submit').click() }
    } else {
      await page.locator('[data-testid^="answer-"]:not([disabled])').first().click(); await page.waitForTimeout(DEBOUNCE)
      if ((await screen.getAttribute('data-phase')) === 'answer') await page.locator('[data-testid^="answer-"]:not([disabled])').first().click()
    }
    await page.waitForTimeout(DEBOUNCE)
    await page.getByTestId('next').click()
  }
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('pause').click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('stop').click()
  await page.waitForTimeout(DEBOUNCE)
  await page.getByTestId('done').click()

  await openAdmin(page)
  await page.getByTestId('tab-verlauf').click()
  await expect(page.getByText('Dies ist kein Test und keine Diagnose.')).toBeVisible()
  await expect(page.getByText('Geübte Minuten pro Woche')).toBeVisible()
  await expect(page.getByTestId('levels').locator('li')).toHaveCount(11)
  await page.getByRole('button', { name: 'Als Tabelle zeigen' }).click()
  await expect(page.getByRole('table')).toContainText('6 min')
  await page.getByRole('button', { name: 'Diagramm zeigen' }).click()
  await page.screenshot({ path: `test-results/screens/${info.project.name}/14-history.png`, fullPage: true })
})
