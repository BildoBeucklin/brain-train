import { defineStore } from 'pinia'
import { liveQuery, type Subscription } from 'dexie'
import { shallowRef } from 'vue'
import { db, type ItemRow } from '@/db/database'
import { applySeed } from '@/db/seed'
import { createContentSource } from '@/exercises/content'

/** Inhalte aus Dexie, live aktualisiert; liefert draw() und pool() an die Generatoren. */
export const useContentStore = defineStore('content', () => {
  const items = shallowRef<ItemRow[]>([])
  const source = createContentSource([], Math.random)
  let sub: Subscription | undefined

  async function load(): Promise<void> {
    await applySeed(db)
    sub?.unsubscribe()
    await new Promise<void>((resolve, reject) => {
      sub = liveQuery(() => db.items.toArray()).subscribe({
        next(rows) { items.value = rows; source.setItems(rows); resolve() },
        error: reject,
      })
    })
  }

  async function addItem(item: Omit<ItemRow, 'id' | 'source' | 'seedKey'>): Promise<number> {
    return db.items.add({ ...item, source: 'user' })
  }

  async function updateItem(id: number, changes: Partial<Omit<ItemRow, 'id' | 'source'>>): Promise<void> {
    await db.items.update(id, changes)
  }

  async function setEnabled(id: number, enabled: boolean): Promise<void> {
    await db.items.update(id, { enabled: enabled ? 1 : 0 })
  }

  return { items, load, draw: source.draw, pool: source.pool, addItem, updateItem, setEnabled }
})
