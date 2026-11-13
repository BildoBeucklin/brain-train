import { band } from '../levels'
import { pick, shuffle } from '../random'
import type { ExerciseDefinition, Task } from '../types'
import { STROOP_COLORS, colorsConfusable, colorsDistinct, type StroopColor } from './colors'

export interface StroopCell {
  word: string // angezeigtes Farbwort
  inkVar: string // CSS-Variable der Schriftfarbe
  ink: StroopColor['id']
}

export interface StroopData {
  cols: number
  cells: StroopCell[]
}

/** Gittergröße je Stufe. */
const GRID = { low: { cols: 3, rows: 3 }, mid: { cols: 4, rows: 4 }, high: { cols: 5, rows: 5 } } as const

/** Anzahl Farben: Niveau 1 → 2 Farben, Niveau 10 → 7 Farben. */
export const colorCount = (level: number) => Math.min(7, 2 + Math.floor((level - 1) * 5 / 9))

/**
 * Wählt n verschiedene Farben. Zuerst solche, die auch bei Rot-Grün-Schwäche unterscheidbar sind;
 * reicht das nicht (ab etwa 4 Farben), werden Farben ergänzt, die bei normalem Sehen klar verschieden sind.
 */
function distinctColors(random: () => number, n: number): StroopColor[] {
  const order = shuffle(random, [...STROOP_COLORS])
  const chosen: StroopColor[] = []
  for (const c of order) {
    if (chosen.length < n && chosen.every((o) => !colorsConfusable(c, o))) chosen.push(c)
  }
  for (const c of order) {
    if (chosen.length < n && !chosen.includes(c) && chosen.every((o) => colorsDistinct(c, o))) chosen.push(c)
  }
  return chosen
}

/**
 * Farb-Wort-Übung: Ein Gitter aus Farbwörtern. Laut vorgelesen wird die Schriftfarbe, nicht das Wort.
 * Farbanzahl steigt von 2 (Niveau 1) bis 7 (Niveau 10).
 * Niveau 1–3: 3×3, Wort und Farbe passen meist zusammen.
 * Niveau 4–7: 4×4, Wort und Farbe passen nie.
 * Niveau 8–10: 5×5, Wort und Farbe passen nie, keine zwei gleichen Farben nebeneinander.
 */
export const stroop: ExerciseDefinition<StroopData> = {
  key: 'stroop',
  label: 'Farben lesen',
  icon: 'Palette',
  usesContent: false,
  companionTips: {
    low: 'Zeigen Sie mit dem Finger mit und nennen Sie die Farben gemeinsam.',
    mid: 'Nur die Farbe der Buchstaben nennen – das Wort darf man überhören.',
    high: 'Zügig, aber ohne Hast: lieber richtig als schnell.',
  },
  generate({ level, random }): Task<StroopData> {
    const b = band(level)
    const { cols, rows } = GRID[b]
    const palette = distinctColors(random, colorCount(level))
    const cells: StroopCell[] = []
    for (let i = 0; i < cols * rows; i++) {
      const left = i % cols > 0 ? cells[i - 1]!.ink : undefined
      const inkChoices = b === 'high' ? palette.filter((c) => c.id !== left) : palette
      const ink = pick(random, inkChoices)
      const match = b === 'low' && random() < 0.7
      const word = match ? ink : pick(random, palette.filter((c) => c.id !== ink.id))
      cells.push({ word: word.name.toLowerCase(), inkVar: ink.cssVar, ink: ink.id })
    }
    return {
      exercise: 'stroop', level, select: 'single',
      prompt: 'Nennen Sie laut die Farben der Wörter – nicht, was dasteht.',
      data: { cols, cells },
      options: [{ id: 'a', label: 'Fertig gelesen' }],
      correctIds: ['a'],
      hint: 'Zeile für Zeile von links nach rechts. Nur die Farbe zählt.',
      explanation: 'Gut gemacht! Es zählt nur die Farbe der Buchstaben.',
    }
  },
}
