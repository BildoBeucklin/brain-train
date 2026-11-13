import { band, withinBand } from '../levels'
import { choice } from '../build'
import { euro } from '../math/generator'
import { randInt, sample, shuffle } from '../random'
import type { ExerciseDefinition, Option, Task } from '../types'
import { amount, PRODUCTS, type Product } from './products'

export interface ShoppingLine { key: string; label: string; count: number; cents?: number }

export interface ShoppingData {
  list: ShoppingLine[]
  /** Laden (Niveau 1–7): Waren im Regal und höchste wählbare Anzahl */
  shelf?: string[]
  maxCount?: number
  paidCents?: number
}

/** Antwort-ID im Laden: Ware und Anzahl, z. B. „apple:3“. */
export const shopId = (key: string, n: number) => `${key}:${n}`
export const parseShopId = (id: string) => {
  const [key, n] = id.split(':')
  return { key: key!, count: Number(n) }
}

const line = (pr: Product, count: number, withPrice = false): ShoppingLine =>
  ({ key: pr.key, label: amount(pr, count), count, ...(withPrice ? { cents: pr.cents } : {}) })

/** Nahe, aber falsche Beträge (typische Rechenfehler). */
function nearbyCents(random: () => number, correct: number, n: number): number[] {
  const steps = shuffle(random, [10, 20, 50, 100, -10, -20, -50, -100, 30, -30])
  return steps.map((s) => correct + s).filter((c) => c > 0).slice(0, n)
}

/** Laden je Stufe: Waren im Regal, Zeilen auf dem Zettel, Anzahl je Zeile, höchste wählbare Anzahl. */
const SHOP = {
  low: { shelf: 6, lines: [2, 3], counts: [1, 2], max: 3 },
  mid: { shelf: 9, lines: [3, 4], counts: [1, 5], max: 5 },
} as const

/**
 * Einkaufen.
 * 1–7: Laden – oben das Regal, unten der Einkaufszettel zum Aufklappen. Ware antippen, Anzahl wählen, „Fertig“.
 * 8–10: rechnen – Gesamtpreis (8), Rückgeld (9–10).
 */
export const shopping: ExerciseDefinition<ShoppingData> = {
  key: 'shopping',
  label: 'Einkaufen',
  icon: 'ShoppingCart',
  usesContent: false,
  companionTips: {
    low: 'Den Zettel gemeinsam vorlesen und jede Ware im Regal zeigen.',
    mid: 'Bei jeder Ware erst auf dem Zettel nachsehen, wie viele es sein sollen.',
    high: 'Ruhig auf einem Zettel mitrechnen – erst die Mengen, dann zusammenzählen.',
  },
  generate({ level, random }): Task<ShoppingData> {
    const b = band(level)
    const countable = PRODUCTS.filter((pr) => pr.countable)

    if (b !== 'high') {
      const cfg = SHOP[b]
      const shelf = sample(random, b === 'low' ? PRODUCTS : countable, cfg.shelf)
      const lines = withinBand(level) < 0.5 ? cfg.lines[0] : cfg.lines[1]
      const needed = sample(random, shelf, lines).map((pr) => ({ pr, n: randInt(random, cfg.counts[0], cfg.counts[1]) }))
      const options: Option[] = shelf.flatMap((pr) => Array.from({ length: cfg.max }, (_, i) =>
        ({ id: shopId(pr.key, i + 1), label: amount(pr, i + 1), image: pr.key, count: i + 1 })))
      return {
        exercise: 'shopping', level, select: 'multi', custom: true,
        prompt: 'Kaufen Sie ein, was auf dem Einkaufszettel steht.',
        data: { list: needed.map(({ pr, n }) => line(pr, n)), shelf: shelf.map((pr) => pr.key), maxCount: cfg.max },
        options,
        correctIds: needed.map(({ pr, n }) => shopId(pr.key, n)),
        hint: 'Öffnen Sie den Einkaufszettel und vergleichen Sie Ware und Anzahl.',
        explanation: `Auf dem Zettel: ${needed.map(({ pr, n }) => amount(pr, n)).join(', ')}.`,
      }
    }

    // Rechnen
    const lines = sample(random, countable, withinBand(level) < 0.5 ? 2 : 3).map((pr) => ({ pr, n: randInt(random, 1, 3) }))
    const total = lines.reduce((s, { pr, n }) => s + pr.cents * n, 0)
    const sum = lines.map(({ pr, n }) => (n > 1 ? `${n} × ${euro(pr.cents)}` : euro(pr.cents))).join(' + ')
    const list = lines.map(({ pr, n }) => line(pr, n, true))

    if (level === 8) {
      const { options, correctIds } = choice(random, { label: euro(total) }, nearbyCents(random, total, 3).map((c) => ({ label: euro(c) })))
      return {
        exercise: 'shopping', level, select: 'single',
        prompt: 'Was kostet der Einkauf zusammen?',
        data: { list }, options, correctIds,
        hint: 'Erst jede Zeile ausrechnen (Anzahl mal Preis), dann zusammenzählen.',
        explanation: `${sum} = ${euro(total)}`,
      }
    }

    const paidCents = [500, 1000, 2000].find((c) => c > total) ?? Math.ceil((total + 1) / 1000) * 1000
    const change = paidCents - total
    const { options, correctIds } = choice(random, { label: euro(change) }, nearbyCents(random, change, 3).map((c) => ({ label: euro(c) })))
    return {
      exercise: 'shopping', level, select: 'single',
      prompt: `Sie bezahlen mit ${euro(paidCents)}. Wie viel bekommen Sie zurück?`,
      data: { list, paidCents }, options, correctIds,
      hint: `Erst den Gesamtpreis ausrechnen, dann bis ${euro(paidCents)} hochzählen.`,
      explanation: `${sum} = ${euro(total)}; ${euro(paidCents)} − ${euro(total)} = ${euro(change)}`,
    }
  },
}
