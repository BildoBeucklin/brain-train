import { optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import type { ExerciseDefinition, Task } from '../types'

export interface OppositePayload {
  word: string
  opposite: string
  distractors: string[] // ähnlichstes zuerst
}

export interface OppositeData { word: string }

/** 1–3: heiß – kalt, 4–7: Ebbe – Flut, 8–10: großzügig – geizig. */
export const opposites: ExerciseDefinition<OppositeData> = {
  key: 'opposites',
  label: 'Gegenteile',
  icon: 'ArrowLeftRight',
  usesContent: true,
  companionTips: {
    low: 'Mit Gesten helfen: groß – klein mit den Händen zeigen.',
    mid: 'Einen Satz bilden: „Das Gegenteil von … ist …“',
    high: 'Nach einem Menschen fragen, der so ist – und nach dem Gegenteil.',
  },
  generate(ctx): Task<OppositeData> {
    const { level, random } = ctx
    const item = requireItem<OppositePayload>(ctx, 'opposites')
    const p = item.payload
    const { options, correctIds } = choice(random, { label: p.opposite }, labels(pickDistractors(p.distractors, optionCount(level) - 1, level)))
    return {
      exercise: 'opposites', level, select: 'single', itemId: item.id,
      prompt: `Was ist das Gegenteil von „${p.word}“?`,
      data: { word: p.word },
      options, correctIds,
      hint: `Gesucht ist das Gegenteil, nicht ein ähnliches Wort. Was ist ganz anders als „${p.word}“?`,
      explanation: `Das Gegenteil von „${p.word}“ ist „${p.opposite}“.`,
    }
  },
}
