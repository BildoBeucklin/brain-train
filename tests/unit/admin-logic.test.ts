import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GsDatabase, type Attempt, type Session } from '@/db/database'
import { applySeed } from '@/db/seed'
import { backupDue, exportAll, exportContent, importBackup, ImportError, markExported, parseBackup } from '@/db/backup'
import { hasPin, setPin, verifyPin } from '@/lib/pin'
import { levelsByExercise, minutesPerWeek, mondayOf } from '@/lib/history'
import { itemSummary, validateItem } from '@/exercises/schemas'

let db: GsDatabase | undefined
afterEach(async () => { await db?.delete(); db = undefined })
const fresh = async (name: string) => { db = new GsDatabase(name); await db.open(); return db }

describe('PIN', () => {
  it('wird nur als gesalzener Hash gespeichert und geprüft', async () => {
    const d = await fresh('pin')
    expect(await hasPin(d)).toBe(false)
    await setPin(d, '4711')
    const stored = JSON.stringify((await d.settings.get('pin'))?.value)
    expect(stored).not.toContain('4711')
    expect(await verifyPin(d, '4711')).toBe(true)
    expect(await verifyPin(d, '1234')).toBe(false)
  })

  it('verlangt genau 4 Ziffern', async () => {
    const d = await fresh('pin2')
    await expect(setPin(d, '12a4')).rejects.toThrow()
    await expect(setPin(d, '123')).rejects.toThrow()
  })

  it('gleiche PIN auf zwei Geräten ergibt verschiedene Hashes (Salt)', async () => {
    const a = await fresh('pin3'); await setPin(a, '0000')
    const ha = (await a.settings.get('pin'))!.value
    await a.delete()
    const b = await fresh('pin4'); await setPin(b, '0000')
    expect((await b.settings.get('pin'))!.value).not.toEqual(ha)
  })
})

describe('Inhalts-Schemas (zod)', () => {
  it('akzeptiert einen gültigen Eintrag und entfernt leere Felder', () => {
    const r = validateItem('opposites', { word: ' heiß ', opposite: 'kalt', distractors: ['warm', 'nass', 'laut', ''] }, 1, 3)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.payload).toEqual({ word: 'heiß', opposite: 'kalt', distractors: ['warm', 'nass', 'laut'] })
  })

  it('meldet fehlende Felder, zu wenige Ablenker und die Lösung unter den Ablenkern', () => {
    const r = validateItem('opposites', { word: '', opposite: 'kalt', distractors: ['kalt', 'nass'] }, 1, 3)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.word).toBeTruthy()
      expect(r.errors.distractors).toBeTruthy()
    }
    const dup = validateItem('opposites', { word: 'heiß', opposite: 'kalt', distractors: ['Kalt', 'nass', 'laut'] }, 1, 3)
    expect(dup.ok).toBe(false)
  })

  it('prüft den Niveaubereich', () => {
    const r = validateItem('memory', { thing: 'Uhr' }, 7, 3)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.maxLevel).toBeTruthy()
  })

  it('Rückwärts lesen: nur ein Wort', () => {
    expect(validateItem('reverse', { text: 'zwei Wörter', distractors: ['a', 'b', 'c'] }, 1, 3).ok).toBe(false)
  })

  it('alle Standardinhalte sind nach den Editor-Regeln gültig', async () => {
    const { buildSeedItems } = await import('@/db/seed')
    for (const i of buildSeedItems()) {
      const r = validateItem(i.exercise, i.payload, i.minLevel, i.maxLevel)
      expect(r.ok, `${i.seedKey}: ${JSON.stringify(!r.ok && r.errors)}`).toBe(true)
    }
  })

  it('Kurzbeschreibung für Listen', () => {
    expect(itemSummary('opposites', { word: 'heiß', opposite: 'kalt' })).toBe('heiß ↔ kalt')
  })
})

describe('Export und Import', () => {
  const userItem = { exercise: 'opposites' as const, minLevel: 1 as const, maxLevel: 3 as const, payload: { word: 'Ost', opposite: 'West', distractors: ['Nord', 'Süd', 'Mitte'] }, source: 'user' as const, enabled: 1 as const }

  it('Inhalte-Export enthält nur eigene Inhalte, keine Personendaten', async () => {
    const d = await fresh('exp1')
    await applySeed(d)
    await d.items.add(userItem)
    await d.profiles.add({ name: 'Maria', icon: 'sun', color: 'sun', createdAt: 0 })
    const file = await exportContent(d)
    expect(file.items).toHaveLength(1)
    expect(JSON.stringify(file)).not.toContain('Maria')
    expect(file.profiles).toBeUndefined()
  })

  it('Import fügt hinzu, überspringt Duplikate und verwirft Ungültiges', async () => {
    const src = await fresh('exp2'); await src.items.add(userItem)
    const text = JSON.stringify(await exportContent(src))
    await src.delete()

    const dst = await fresh('imp2'); await applySeed(dst)
    const before = await dst.items.count()
    const file = parseBackup(text)
    file.items.push({ exercise: 'opposites', minLevel: 1, maxLevel: 3, payload: { word: '' }, enabled: 1 })
    expect(await importBackup(dst, file)).toMatchObject({ added: 1, skipped: 0, invalid: 1 })
    expect(await importBackup(dst, file)).toMatchObject({ added: 0, skipped: 1, invalid: 1 })
    expect(await dst.items.count()).toBe(before + 1)
    expect((await dst.items.where('source').equals('user').first())?.payload).toEqual(userItem.payload)
  })

  it('Sicherung stellt Profile und Verlauf wieder her, ohne PIN', async () => {
    const src = await fresh('exp3')
    await setPin(src, '1234')
    const pid = await src.profiles.add({ name: 'Maria', icon: 'sun', color: 'sun', createdAt: 0 })
    await src.skills.put({ profileId: pid, exercise: 'math', level: 5, streak: 0, lastAt: 0 })
    await src.sessions.add({ profileId: pid, mode: 'alone', startedAt: 0, activeMs: 60_000 })
    const file = await exportAll(src)
    expect(JSON.stringify(file)).not.toContain('"pin"')
    await src.delete()

    const dst = await fresh('imp3')
    await setPin(dst, '9999')
    await importBackup(dst, parseBackup(JSON.stringify(file)), { replacePeople: true })
    expect((await dst.profiles.toArray())[0]?.name).toBe('Maria')
    expect((await dst.skills.get([pid, 'math']))?.level).toBe(5)
    expect(await verifyPin(dst, '9999')).toBe(true) // PIN des Geräts bleibt
  })

  it('lehnt fremde oder kaputte Dateien ab', () => {
    expect(() => parseBackup('kein json')).toThrow(ImportError)
    expect(() => parseBackup('{"format":"anders"}')).toThrow(ImportError)
    expect(() => parseBackup(JSON.stringify({ format: 'gedaechtnisstunde', version: 99, kind: 'inhalte', exportedAt: 0, items: [] }))).toThrow(ImportError)
  })

  it('erinnert alle 30 Tage an eine Sicherung', async () => {
    const d = await fresh('remind')
    const DAY = 86_400_000
    expect(await backupDue(d, 0)).toBe(false) // ohne Profile keine Erinnerung
    await d.profiles.add({ name: 'Maria', icon: 'sun', color: 'sun', createdAt: 0 })
    expect(await backupDue(d, 0)).toBe(true)
    await markExported(d, 0)
    expect(await backupDue(d, 30 * DAY)).toBe(false)
    expect(await backupDue(d, 31 * DAY)).toBe(true)
  })
})

describe('Verlauf', () => {
  const now = new Date(2026, 10, 11, 12).getTime() // Mittwoch
  const s = (daysAgo: number, mode: Session['mode'], activeMs?: number, id = daysAgo): Session =>
    ({ id, profileId: 1, mode, startedAt: now - daysAgo * 86_400_000, activeMs })

  it('Minuten pro Woche, getrennt nach allein und betreut, ohne Pausen', () => {
    const weeks = minutesPerWeek([s(0, 'alone', 15 * 60_000), s(1, 'assisted', 10 * 60_000), s(7, 'alone', 5 * 60_000)], [], now, 8)
    expect(weeks).toHaveLength(8)
    expect(weeks.at(-1)).toMatchObject({ alone: 15, assisted: 10 })
    expect(weeks.at(-2)).toMatchObject({ alone: 5, assisted: 0 })
    expect(weeks.at(-1)!.weekStart).toBe(mondayOf(now))
    expect(weeks.at(-1)!.label).toMatch(/^KW \d+$/)
  })

  it('ohne gespeicherte Dauer zählen die Antwortzeiten (gedeckelt)', () => {
    const attempts = [3, 4, 60].map((min, i) => ({ id: i, sessionId: 99, ms: min * 60_000 }) as Attempt)
    const weeks = minutesPerWeek([s(0, 'alone', undefined, 99)], attempts, now)
    expect(weeks.at(-1)!.alone).toBe(12) // 3 + 4 + 5 (gedeckelt)
  })

  it('Niveau je Übung mit Startwert 2 für ungeübte Übungen', () => {
    const r = levelsByExercise([{ profileId: 1, exercise: 'math', level: 6, streak: 0, lastAt: 0, locked: true }], [], ['math', 'stroop'])
    expect(r).toEqual([
      { exercise: 'math', level: 6, locked: true, lastAt: undefined, practiced: 0 },
      { exercise: 'stroop', level: 2, locked: false, lastAt: undefined, practiced: 0 },
    ])
  })
})
