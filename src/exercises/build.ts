import type { ExerciseId, ItemRow, Level } from '@/db/database'
import { shuffle } from './random'
import type { GenerateContext, Option } from './types'

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const

/** Mischt richtige Antwort und Ablenker zu Antwortflächen. Doppelte Beschriftungen werden entfernt. */
export function choice(
  random: () => number,
  correct: Omit<Option, 'id'>,
  distractors: readonly Omit<Option, 'id'>[],
): { options: Option[]; correctIds: string[] } {
  const seen = new Set([correct.label.toLocaleLowerCase('de')])
  const unique = distractors.filter((d) => {
    const k = d.label.toLocaleLowerCase('de')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const all = shuffle(random, [{ ...correct, correct: true }, ...unique.map((d) => ({ ...d, correct: false }))])
  const options = all.map(({ correct: _c, ...o }, i) => ({ ...o, id: IDS[i]! }))
  return { options, correctIds: [options[all.findIndex((o) => o.correct)]!.id] }
}

export const labels = (xs: readonly string[]) => xs.map((label) => ({ label }))

/** Zieht einen Inhalt oder bricht mit klarer Meldung ab (z. B. wenn alle Inhalte deaktiviert sind). */
export function requireItem<P>(ctx: GenerateContext, exercise: ExerciseId, level: Level = ctx.level): ItemRow<P> {
  const item = ctx.draw<P>(exercise, level)
  if (!item) throw new NoContentError(exercise, level)
  return item
}

export class NoContentError extends Error {
  constructor(readonly exercise: ExerciseId, readonly level: Level) {
    super(`Keine aktiven Inhalte für ${exercise} auf Niveau ${level}`)
  }
}
