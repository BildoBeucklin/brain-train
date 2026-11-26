import { describe, expect, it } from 'vitest'
import type { ItemRow, Level } from '@/db/database'
import { createContentSource, ShuffleBag } from './content'
import { seededRandom } from './random'

describe('ShuffleBag', () => {
  it('wiederholt nichts, bevor alle einmal dran waren', () => {
    const bag = new ShuffleBag([1, 2, 3, 4, 5], seededRandom(7))
    for (let round = 0; round < 20; round++) {
      const drawn = Array.from({ length: 5 }, () => bag.next())
      expect(new Set(drawn).size).toBe(5)
    }
  })

  it('zieht nach dem Nachfüllen nicht sofort denselben', () => {
    const bag = new ShuffleBag([1, 2, 3], seededRandom(3))
    let last = bag.next()
    for (let i = 0; i < 300; i++) {
      const n = bag.next()
      expect(n).not.toBe(last)
      last = n
    }
  })
})

describe('createContentSource', () => {
  const item = (id: number, minLevel: number, maxLevel: number, enabled: 0 | 1 = 1): ItemRow => ({
    id, exercise: 'opposites', minLevel: minLevel as Level, maxLevel: maxLevel as Level, payload: {}, source: 'seed', enabled,
  })
  const items = [item(1, 1, 3), item(2, 1, 3), item(3, 4, 7), item(4, 1, 3, 0)]

  it('liefert nur aktive Inhalte im Niveaubereich', () => {
    const src = createContentSource(items, seededRandom(1))
    expect(src.pool('opposites', 2).map((i) => i.id).sort()).toEqual([1, 2])
    expect(src.pool('opposites', 5).map((i) => i.id)).toEqual([3])
    expect(src.pool('opposites', 9)).toEqual([])
    const drawn = new Set(Array.from({ length: 10 }, () => src.draw('opposites', 2)?.id))
    expect(drawn).toEqual(new Set([1, 2]))
    expect(src.draw('opposites', 9)).toBeUndefined()
  })

  it('übernimmt geänderte Inhalte (z. B. deaktiviert)', () => {
    const src = createContentSource(items, seededRandom(1))
    src.draw('opposites', 2)
    src.setItems([item(1, 1, 3, 0), item(2, 1, 3)])
    expect(Array.from({ length: 5 }, () => src.draw('opposites', 2)?.id)).toEqual([2, 2, 2, 2, 2])
  })
})
