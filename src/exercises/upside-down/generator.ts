import { band, optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import type { ExerciseDefinition, Task } from '../types'
import { upper, type WordPayload } from '../words'

export interface UpsideDownData { text: string } // die UI dreht den Text um 180°

/** 1–3: kurze Wörter in Großbuchstaben, 4–7: längere Wörter gemischt, 8–10: kurze Sätze. */
export const upsideDown: ExerciseDefinition<UpsideDownData> = {
  key: 'upsideDown',
  label: 'Auf dem Kopf',
  icon: 'FlipVertical2',
  usesContent: true,
  companionTips: {
    low: 'Wenn es schwerfällt: Kopf etwas zur Seite neigen hilft beim Lesen.',
    mid: 'Buchstaben einzeln von rechts nach links lesen lassen.',
    high: 'Erst das erste Wort entziffern, dann den Satz erraten lassen.',
  },
  generate(ctx): Task<UpsideDownData> {
    const { level, random } = ctx
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
