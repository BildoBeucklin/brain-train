import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GsDatabase } from '@/db/database'

let db: GsDatabase | undefined

afterEach(async () => { await db?.delete() })

describe('GsDatabase v1', () => {
  it('legt die sechs Tabellen an', async () => {
    db = new GsDatabase('test-tables')
    await db.open()
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['attempts', 'items', 'profiles', 'sessions', 'settings', 'skills'])
  })

  it('findet Inhalte über [exercise+minLevel]', async () => {
    db = new GsDatabase('test-items')
    await db.items.bulkAdd([
      { exercise: 'proverbs', minLevel: 1, maxLevel: 3, payload: { start: 'Morgenstund hat', end: 'Gold im Mund.' }, source: 'seed', enabled: 1, seedKey: 'proverbs-001' },
      { exercise: 'proverbs', minLevel: 4, maxLevel: 7, payload: {}, source: 'seed', enabled: 1 },
      { exercise: 'proverbs', minLevel: 8, maxLevel: 10, payload: {}, source: 'user', enabled: 1 },
    ])
    const upTo5 = await db.items.where('[exercise+minLevel]').between(['proverbs', 1], ['proverbs', 5], true, true).toArray()
    expect(upTo5).toHaveLength(2)
    expect(await db.items.where('source').equals('user').count()).toBe(1)
  })

  it('speichert ein Niveau je Profil und Übung', async () => {
    db = new GsDatabase('test-skills')
    await db.skills.put({ profileId: 1, exercise: 'math', level: 2, streak: 0, lastAt: 0 })
    await db.skills.put({ profileId: 1, exercise: 'math', level: 3, streak: 1, lastAt: 1 })
    expect(await db.skills.count()).toBe(1)
    expect((await db.skills.get([1, 'math']))?.level).toBe(3)
  })

  it('löscht ein Profil samt Niveaus, Versuchen und Einheiten', async () => {
    db = new GsDatabase('test-delete')
    const keep = await db.profiles.add({ name: 'Erna', icon: 'Flower2', color: '#1e5e55', createdAt: 0 })
    const gone = await db.profiles.add({ name: 'Hans', icon: 'Anchor', color: '#2b4a8a', createdAt: 0 })
    for (const profileId of [keep, gone]) {
      const sessionId = await db.sessions.add({ profileId, mode: 'alone', startedAt: 0 })
      await db.skills.put({ profileId, exercise: 'stroop', level: 2, streak: 0, lastAt: 0 })
      await db.attempts.add({ sessionId, profileId, exercise: 'stroop', level: 2, correct: true, tries: 1, hint: false, assisted: false, ms: 1000, at: 0 })
    }
    await db.deleteProfile(gone)
    expect(await db.profiles.toArray()).toHaveLength(1)
    for (const t of [db.skills, db.attempts, db.sessions]) {
      expect(await t.where('profileId').equals(gone).count()).toBe(0)
      expect(await t.where('profileId').equals(keep).count()).toBe(1)
    }
  })
})
