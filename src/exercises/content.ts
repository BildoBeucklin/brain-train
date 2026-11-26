import type { ExerciseId, ItemRow, Level } from '@/db/database'
import { shuffle } from './random'
import type { DrawFn, PoolFn } from './types'

/** Inhalte, die für ein Niveau infrage kommen (aktiv und im Niveaubereich). */
export function eligible<P>(items: readonly ItemRow<P>[], exercise: ExerciseId, level: Level): ItemRow<P>[] {
  return items.filter((i) => i.exercise === exercise && i.enabled === 1 && i.minLevel <= level && level <= i.maxLevel)
}

/**
 * Shuffle-Bag: Jeder Inhalt kommt einmal dran, bevor sich einer wiederholt.
 * Nach dem Nachfüllen wird der zuletzt gezogene nicht sofort wieder gezogen.
 */
export class ShuffleBag<T> {
  private bag: T[] = []
  private last: T | undefined

  constructor(private items: readonly T[], private readonly random: () => number) {}

  setItems(items: readonly T[]): void {
    this.items = items
    this.bag = this.bag.filter((x) => items.includes(x))
  }

  next(): T | undefined {
    if (this.items.length === 0) return undefined
    if (this.bag.length === 0) {
      this.bag = shuffle(this.random, this.items)
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.last) this.bag.unshift(this.bag.pop()!)
    }
    this.last = this.bag.pop()
    return this.last
  }
}

export interface ContentSource {
  draw: DrawFn
  pool: PoolFn
  setItems(items: readonly ItemRow[]): void
}

/** Inhaltsquelle für die Generatoren; kennt keine Datenbank. */
export function createContentSource(items: readonly ItemRow[], random: () => number): ContentSource {
  let all = items
  const bags = new Map<string, ShuffleBag<ItemRow>>()

  const pool: PoolFn = <P>(exercise: ExerciseId, level: Level) => eligible(all, exercise, level) as ItemRow<P>[]

  const draw: DrawFn = <P>(exercise: ExerciseId, level: Level) => {
    const key = `${exercise}:${level}`
    const candidates = eligible(all, exercise, level)
    let bag = bags.get(key)
    if (!bag) bags.set(key, (bag = new ShuffleBag(candidates, random)))
    else bag.setItems(candidates)
    return bag.next() as ItemRow<P> | undefined
  }

  return {
    draw,
    pool,
    setItems(next) {
      all = next
      for (const [key, bag] of bags) {
        const [exercise, level] = key.split(':') as [ExerciseId, string]
        bag.setItems(eligible(all, exercise, Number(level) as Level))
      }
    },
  }
}
