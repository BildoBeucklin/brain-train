import type { ExerciseId, GsDatabase, ItemRow, Level } from '../database'
import words from './words.json'
import proverbs from './proverbs.json'
import oddOneOut from './odd-one-out.json'
import opposites from './opposites.json'
import wordFinding from './word-finding.json'
import memory from './memory.json'

/** Bei jeder Änderung an den Seed-Dateien erhöhen. */
export const SEED_VERSION = 1

type Row = ItemRow & { seedKey: string }

const row = (exercise: ExerciseId, key: string, minLevel: number, maxLevel: number, payload: unknown): Row => ({
  exercise, seedKey: `${exercise}:${key}`, minLevel: minLevel as Level, maxLevel: maxLevel as Level,
  payload, source: 'seed', enabled: 1,
})

type Entry<T> = T & { key: string; min: number; max: number }
const strip = <T extends { key: string; min: number; max: number }>({ key: _k, min: _a, max: _b, ...rest }: T) => rest

export function buildSeedItems(): Row[] {
  return [
    ...words.short.flatMap(({ key, ...p }) => [row('upsideDown', key, 1, 3, p), row('reverse', key, 1, 3, p)]),
    ...words.medium.flatMap(({ key, ...p }) => [row('upsideDown', key, 4, 7, p), row('reverse', key, 4, 7, p)]),
    ...words.long.map(({ key, ...p }) => row('reverse', key, 8, 10, p)),
    ...words.sentences.map(({ key, ...p }) => row('upsideDown', key, 8, 10, p)),
    ...(proverbs as Entry<object>[]).map((e) => row('proverbs', e.key, e.min, e.max, strip(e))),
    ...(oddOneOut as Entry<object>[]).map((e) => row('oddOneOut', e.key, e.min, e.max, strip(e))),
    ...(opposites as Entry<object>[]).map((e) => row('opposites', e.key, e.min, e.max, strip(e))),
    ...(wordFinding as Entry<object>[]).map((e) => row('wordFinding', e.key, e.min, e.max, strip(e))),
    ...memory.map(({ key, ...p }) => row('memory', key, 1, 10, p)),
  ]
}

/**
 * Spielt die Standardinhalte ein, wenn die gespeicherte Seed-Version älter ist.
 * Eigene Einträge (source 'user') bleiben unberührt; ob ein Seed-Eintrag deaktiviert wurde, bleibt erhalten.
 * Seed-Einträge, die es nicht mehr gibt, werden entfernt.
 */
export async function applySeed(db: GsDatabase, version = SEED_VERSION, items = buildSeedItems()): Promise<boolean> {
  return db.transaction('rw', db.items, db.settings, async () => {
    const stored = (await db.settings.get('seedVersion'))?.value as number | undefined
    if (stored !== undefined && stored >= version) return false

    const existing = await db.items.where('source').equals('seed').toArray()
    const byKey = new Map(existing.map((i) => [i.seedKey, i]))
    const keep = new Set(items.map((i) => i.seedKey))

    await db.items.bulkPut(items.map((i) => {
      const old = byKey.get(i.seedKey)
      return old ? { ...i, id: old.id, enabled: old.enabled } : i
    }))
    await db.items.bulkDelete(existing.filter((i) => !keep.has(i.seedKey!)).map((i) => i.id!))
    await db.settings.put({ key: 'seedVersion', value: version })
    return true
  })
}
