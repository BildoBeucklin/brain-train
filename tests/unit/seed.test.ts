import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GsDatabase } from '@/db/database'
import { applySeed, buildSeedItems, SEED_VERSION } from '@/db/seed'
import { EXERCISE_IDS, registry } from '@/exercises/registry'
import { LEVELS } from '@/exercises/levels'
import { eligible } from '@/exercises/content'

let db: GsDatabase | undefined
afterEach(async () => { await db?.delete() })

describe('Seed-Inhalte', () => {
  const items = buildSeedItems()

  it('seedKeys sind eindeutig', () => {
    const keys = items.map((i) => i.seedKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(EXERCISE_IDS.filter((e) => registry[e].usesContent))('%s hat auf jedem Niveau genug Inhalte', (ex) => {
    for (const level of LEVELS) {
      expect(eligible(items, ex, level).length, `Niveau ${level}`).toBeGreaterThanOrEqual(ex === 'memory' ? 9 : 8)
    }
  })

  it('Rückwärts lesen: 3–4, 5–7 und 10–14 Buchstaben', () => {
    const len = (level: number) => eligible(items, 'reverse', level as 1).map((i) => (i.payload as { text: string }).text.length)
    for (const n of len(2)) expect(n).toBeGreaterThanOrEqual(3), expect(n).toBeLessThanOrEqual(4)
    for (const n of len(5)) expect(n).toBeGreaterThanOrEqual(5), expect(n).toBeLessThanOrEqual(7)
    for (const n of len(9)) expect(n).toBeGreaterThanOrEqual(10), expect(n).toBeLessThanOrEqual(14)
  })

  it('jeder Eintrag hat mindestens 3 Ablenker, die sich von der Lösung unterscheiden', () => {
    for (const i of items) {
      const p = i.payload as Record<string, unknown>
      const [answer, distractors] =
        i.exercise === 'proverbs' && i.minLevel >= 8 ? [p.meaning, p.meaningDistractors]
        : i.exercise === 'proverbs' ? [p.end, p.distractors]
        : i.exercise === 'opposites' ? [p.opposite, p.distractors]
        : i.exercise === 'wordFinding' ? [p.answer, p.distractors]
        : i.exercise === 'oddOneOut' ? [p.odd, p.members]
        : i.exercise === 'memory' ? [p.thing, ['', '', '']]
        : [p.text, p.distractors]
      const list = distractors as string[]
      expect(list.length, i.seedKey).toBeGreaterThanOrEqual(i.exercise === 'oddOneOut' ? 4 : 3)
      expect(list.map((d) => d.toLowerCase()), i.seedKey).not.toContain(String(answer).toLowerCase())
    }
  })
})

describe('applySeed', () => {
  it('spielt beim ersten Start alle Standardinhalte ein', async () => {
    db = new GsDatabase('seed-first')
    expect(await applySeed(db)).toBe(true)
    expect(await db.items.count()).toBe(buildSeedItems().length)
    expect((await db.settings.get('seedVersion'))?.value).toBe(SEED_VERSION)
    expect(await applySeed(db)).toBe(false)
  })

  it('eigene Einträge und deaktivierte Standardinhalte überstehen ein Seed-Update', async () => {
    db = new GsDatabase('seed-update')
    const v1 = buildSeedItems()
    await applySeed(db, 1, v1)

    const userId = await db.items.add({ exercise: 'opposites', minLevel: 1, maxLevel: 3, payload: { word: 'Ost', opposite: 'West', distractors: ['Nord', 'Süd', 'Mitte'] }, source: 'user', enabled: 1 })
    const target = (await db.items.where('seedKey').equals('opposites:heiss').first())!
    await db.items.update(target.id!, { enabled: 0 })

    // Version 2: ein Eintrag geändert, einer entfernt
    const v2 = v1
      .filter((i) => i.seedKey !== 'opposites:gross')
      .map((i) => (i.seedKey === 'opposites:heiss' ? { ...i, payload: { ...(i.payload as object), opposite: 'eiskalt' } } : i))
    expect(await applySeed(db, 2, v2)).toBe(true)

    expect(await db.items.get(userId)).toMatchObject({ source: 'user', payload: { word: 'Ost' } })
    const updated = (await db.items.where('seedKey').equals('opposites:heiss').first())!
    expect(updated.id).toBe(target.id)
    expect(updated.enabled).toBe(0)
    expect((updated.payload as { opposite: string }).opposite).toBe('eiskalt')
    expect(await db.items.where('seedKey').equals('opposites:gross').count()).toBe(0)
    expect(await db.items.count()).toBe(v2.length + 1)
  })
})
