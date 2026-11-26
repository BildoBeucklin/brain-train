import type { Level } from '@/db/database'
import { band, optionCount } from '../levels'
import { choice, labels } from '../build'
import { pick, randInt, sample, shuffle } from '../random'
import type { ExerciseDefinition, Task } from '../types'

export type MathData =
  | { kind: 'dots'; count: number }
  | { kind: 'term'; text: string } // '12 + 7'
  | { kind: 'shopping'; items: { name: string; cents: number }[] }
  | { kind: 'change'; items: { name: string; cents: number }[]; paidCents: number }

const GOODS = [
  { name: 'Brot', cents: 300 }, { name: 'Milch', cents: 100 }, { name: 'Butter', cents: 200 },
  { name: 'Kaffee', cents: 600 }, { name: 'Äpfel', cents: 300 }, { name: 'Käse', cents: 400 },
  { name: 'Eier', cents: 200 }, { name: 'Zucker', cents: 100 }, { name: 'Marmelade', cents: 300 },
]

export const euro = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'

/** n unterschiedliche, positive Ablenker nahe am Ergebnis. */
function nearby(random: () => number, correct: number, n: number, steps: number[], min = 0): number[] {
  const out = new Set<number>()
  for (const s of shuffle(random, steps.flatMap((x) => [x, -x]))) {
    const v = correct + s
    if (v >= min && v !== correct) out.add(v)
    if (out.size === n) break
  }
  return [...out]
}

/**
 * 1–3: Punkte zählen bis 3/4/5, 2 zur Wahl.
 * 4–7: Plus und Minus bis 10/20/30, Einkauf bis 50, 3 zur Wahl.
 * 8–10: Rückgeld, 4 zur Wahl.
 */
export const math: ExerciseDefinition<MathData> = {
  key: 'math',
  label: 'Rechnen',
  icon: 'Calculator',
  usesContent: false,
  companionTips: {
    low: 'Punkte gemeinsam mit dem Finger antippen und zählen.',
    mid: 'Beim Einkauf an echte Münzen denken; Zwischenergebnis laut sagen.',
    high: 'Rückgeld vom Preis aus „hochzählen“ lassen, wie früher an der Kasse.',
  },
  generate({ level, random }): Task<MathData> {
    const n = optionCount(level) - 1
    const b = band(level)

    if (b === 'low') {
      const max = level + 2 // 3, 4, 5
      const count = randInt(random, 1, max)
      const other = count === 1 ? 2 : count === max ? count - 1 : count + pick(random, [-1, 1])
      const { options, correctIds } = choice(random, { label: String(count) }, labels([String(other)]))
      return {
        exercise: 'math', level, select: 'single',
        prompt: 'Wie viele Punkte sehen Sie?',
        data: { kind: 'dots', count },
        options, correctIds,
        hint: 'Zählen Sie die Punkte langsam, einen nach dem anderen.',
        explanation: `Es sind ${count} Punkte.`,
      }
    }

    if (b === 'mid' && level <= 6) {
      const limit = ({ 4: 10, 5: 20, 6: 30 } as Record<Level, number>)[level]!
      const plus = level === 4 || random() < 0.5
      let a: number, c: number, result: number
      if (plus) { result = randInt(random, 3, limit); a = randInt(random, 1, result - 1); c = result - a }
      else { a = randInt(random, 3, limit); c = randInt(random, 1, a - 1); result = a - c }
      const text = `${a} ${plus ? '+' : '−'} ${c}`
      const { options, correctIds } = choice(random, { label: String(result) }, labels(nearby(random, result, n, [1, 2, 10]).map(String)))
      return {
        exercise: 'math', level, select: 'single',
        prompt: 'Was ist das Ergebnis?',
        data: { kind: 'term', text },
        options, correctIds,
        hint: plus ? 'Zählen Sie von der größeren Zahl aus weiter.' : 'Zählen Sie von der kleineren Zahl bis zur größeren.',
        explanation: `${text} = ${result}`,
      }
    }

    if (b === 'mid') {
      // Niveau 7: Einkauf mit 3 Dingen, ganze Euro, bis 50
      const items = sample(random, GOODS, 3)
      const total = items.reduce((s, i) => s + i.cents, 0)
      const { options, correctIds } = choice(random, { label: euro(total) }, labels(nearby(random, total, n, [100, 200]).map(euro)))
      return {
        exercise: 'math', level, select: 'single',
        prompt: 'Was kostet der Einkauf zusammen?',
        data: { kind: 'shopping', items },
        options, correctIds,
        hint: 'Rechnen Sie Schritt für Schritt: erst zwei Preise, dann den dritten dazu.',
        explanation: `${items.map((i) => euro(i.cents)).join(' + ')} = ${euro(total)}`,
      }
    }

    // 8–10: Rückgeld; Preise in 50-, dann 10-Cent-Schritten
    const step = level === 8 ? 50 : 10
    const count = level === 10 ? 2 : 1
    const items = sample(random, GOODS, count).map((g) => ({
      name: g.name,
      cents: g.cents + randInt(random, 0, (100 / step) - 1) * step,
    }))
    const total = items.reduce((s, i) => s + i.cents, 0)
    const paidCents = total < 1000 ? 1000 : total < 2000 ? 2000 : 5000
    const change = paidCents - total
    const { options, correctIds } = choice(random, { label: euro(change) },
      labels(nearby(random, change, n, [step, 100, 50, 200], 10).map(euro)))
    return {
      exercise: 'math', level, select: 'single',
      prompt: `Sie bezahlen mit ${euro(paidCents)}. Wie viel Geld bekommen Sie zurück?`,
      data: { kind: 'change', items, paidCents },
      options, correctIds,
      hint: `Zählen Sie vom Preis aus hoch bis ${euro(paidCents)}.`,
      explanation: `${euro(paidCents)} − ${euro(total)} = ${euro(change)}`,
    }
  },
}
