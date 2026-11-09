import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GsDatabase } from '@/db/database'

let db: GsDatabase | undefined

afterEach(async () => { await db?.delete() })

describe('GsDatabase v1', () => {
  it('legt die vier Tabellen an', async () => {
    db = new GsDatabase('test-tables')
    await db.open()
    expect(db.tables.map((t) => t.name).sort()).toEqual(['items', 'sessionEvents', 'sessions', 'settings'])
  })

  it('findet Einträge über [exercise+level] und trennt seed/user', async () => {
    db = new GsDatabase('test-items')
    await db.items.bulkAdd([
      { exercise: 'proverbs', level: 0, payload: { start: 'Morgenstund hat', end: 'Gold im Mund.' }, source: 'seed', enabled: 1, seedKey: 'proverbs-0-1' },
      { exercise: 'proverbs', level: 1, payload: {}, source: 'seed', enabled: 1 },
      { exercise: 'proverbs', level: 0, payload: {}, source: 'user', enabled: 0 },
    ])
    expect(await db.items.where('[exercise+level]').equals(['proverbs', 0]).count()).toBe(2)
    expect(await db.items.where('source').equals('user').count()).toBe(1)
    const seeded = await db.items.where('seedKey').equals('proverbs-0-1').first()
    expect(seeded?.payload).toEqual({ start: 'Morgenstund hat', end: 'Gold im Mund.' })
  })
})
