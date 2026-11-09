import { MAX_LEVEL, MIN_LEVEL, type Level } from '@/db/database'
import type { ExerciseBand } from './types'

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function clampLevel(n: number): Level {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(n))) as Level
}

const BANDS: Record<ExerciseBand, [Level, Level]> = { low: [1, 3], mid: [4, 7], high: [8, 10] }

/** Niveau 1–3 leicht, 4–7 mittel, 8–10 schwer. */
export function band(level: Level): ExerciseBand {
  return level <= 3 ? 'low' : level <= 7 ? 'mid' : 'high'
}

export function bandRange(b: ExerciseBand): [Level, Level] {
  return BANDS[b]
}

/** Position innerhalb der Stufe: 0 = unterstes, 1 = oberstes Niveau. */
export function withinBand(level: Level): number {
  const [lo, hi] = BANDS[band(level)]
  return (level - lo) / (hi - lo)
}

/** Standardzahl der Antwortflächen: 2, 3 oder 4. */
export function optionCount(level: Level): 2 | 3 | 4 {
  return ({ low: 2, mid: 3, high: 4 } as const)[band(level)]
}

/**
 * Wählt n Ablenker aus einer nach Ähnlichkeit sortierten Liste (ähnlichster zuerst).
 * Unten in der Stufe die unähnlicheren, oben die ähnlichsten.
 */
export function pickDistractors<T>(sortedBySimilarity: readonly T[], n: number, level: Level): T[] {
  const list = [...sortedBySimilarity]
  if (list.length <= n) return list
  return withinBand(level) >= 0.5 ? list.slice(0, n) : list.slice(list.length - n)
}
