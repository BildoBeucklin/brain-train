import { band, optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import { pick } from '../random'
import type { ExerciseDefinition, Task } from '../types'
import { upper, type WordPayload } from '../words'

export interface UpsideDownData {
  text: string // die UI dreht den Text um 180°
  lines?: string[] // Niveau 8–10: Unsinnstext laut vorlesen
}

/**
 * Echte Wörter in sinnloser Reihenfolge: Man kann nichts erraten, jedes Wort muss gelesen werden.
 * Niveau 10 nimmt zusätzlich lange Wörter dazu.
 */
const NONSENSE_SHORT = [
  'Rose', 'Tisch', 'blau', 'laufen', 'über', 'Hund', 'leise', 'Brot', 'warm', 'Fenster', 'singen', 'unter',
  'Apfel', 'grün', 'Wolke', 'schnell', 'neben', 'Kaffee', 'rund', 'Garten', 'lesen', 'Mond', 'hinter', 'weich',
  'Schuh', 'tanzen', 'zwölf', 'Stuhl', 'süß', 'Fluss', 'kalt', 'Brücke', 'sieben', 'Löffel', 'morgens', 'Vogel',
  'alt', 'Kerze', 'spät', 'Wiese', 'hoch', 'Zucker', 'gelb', 'Bahn', 'trinken', 'Hut', 'klein', 'Insel', 'oft',
  'Pinsel', 'still', 'Wagen', 'rot', 'Feder', 'lachen', 'Glocke', 'dort', 'Butter', 'eckig', 'Nebel', 'drei',
]
const NONSENSE_LONG = [
  'Sonnenblumenfeld', 'Gartenzwerg', 'Fruchtsaft', 'Leuchtturm', 'Kirschkuchen', 'Fahrkartenschalter',
  'unregelmäßig', 'Regenschirm', 'Schmetterling', 'Briefträgerin', 'Strickjacke', 'Marmeladenglas',
  'Wochenmarkt', 'Kaffeekanne', 'Streuselschnecke', 'Federballspiel', 'außerordentlich', 'Zahnbürste',
]
/** Zeilen und Wörter je Zeile auf Niveau 8, 9, 10 */
const PASSAGE = { 8: [4, 5], 9: [6, 6], 10: [8, 7] } as Record<number, [number, number]>

function nonsense(random: () => number, level: number): string[] {
  const [rows, perRow] = PASSAGE[level] ?? [4, 5]
  const words = level >= 10 ? [...NONSENSE_SHORT, ...NONSENSE_LONG, ...NONSENSE_LONG] : NONSENSE_SHORT
  return Array.from({ length: rows }, () => {
    const row: string[] = []
    while (row.length < perRow) {
      const w = pick(random, words)
      if (w !== row.at(-1)) row.push(w)
    }
    return row.join(' ')
  })
}

/** 1–3: kurze Wörter in Großbuchstaben, 4–7: längere Wörter gemischt, 8–10: Unsinnstext laut vorlesen (mit Uhr), länger je Niveau. */
export const upsideDown: ExerciseDefinition<UpsideDownData> = {
  key: 'upsideDown',
  label: 'Auf dem Kopf',
  icon: 'FlipVertical2',
  usesContent: true,
  companionTips: {
    low: 'Wenn es schwerfällt: Kopf etwas zur Seite neigen hilft beim Lesen.',
    mid: 'Buchstaben einzeln von rechts nach links lesen lassen.',
    high: 'Der Text ist absichtlich Unsinn. Wort für Wort lesen lassen, nicht raten.',
  },
  generate(ctx): Task<UpsideDownData> {
    const { level, random } = ctx
    if (band(level) === 'high') {
      const lines = nonsense(random, level)
      return {
        exercise: 'upsideDown', level, select: 'single',
        prompt: 'Lesen Sie den Text auf dem Kopf laut vor.',
        data: { text: lines.join(' '), lines },
        options: [{ id: 'a', label: 'Fertig gelesen' }],
        correctIds: ['a'],
        hint: 'Der Text ergibt keinen Sinn – lesen Sie Wort für Wort.',
        explanation: 'Gut gemacht! Auf dem Kopf lesen ist eine echte Herausforderung.',
      }
    }
    const item = requireItem<WordPayload>(ctx, 'upsideDown')
    const low = band(level) === 'low'
    const fmt = (s: string) => (low ? upper(s) : s)
    const text = fmt(item.payload.text)
    const distractors = pickDistractors(item.payload.distractors, optionCount(level) - 1, level).map(fmt)
    const { options, correctIds } = choice(random, { label: text }, labels(distractors))
    const sentence = band(level) === 'high'
    return {
      exercise: 'upsideDown', level, select: 'single', itemId: item.id,
      prompt: sentence ? 'Welcher Satz steht hier auf dem Kopf?' : 'Welches Wort steht hier auf dem Kopf?',
      data: { text },
      options, correctIds,
      hint: 'Lesen Sie von rechts nach links.',
      explanation: `Hier steht „${text}“.`,
    }
  },
}
