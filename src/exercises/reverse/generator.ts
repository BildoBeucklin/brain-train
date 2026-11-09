import { band, optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import type { ExerciseDefinition, Task } from '../types'
import { upper, type WordPayload } from '../words'

export interface ReverseData { shown: string } // rückwärts geschriebenes Wort

/** 1–3: 3–4 Buchstaben, 4–7: 5–7 Buchstaben, 8–10: 10–14 Buchstaben mit ähnlichen Ablenkern. */
export const reverse: ExerciseDefinition<ReverseData> = {
  key: 'reverse',
  label: 'Rückwärts lesen',
  icon: 'Undo2',
  usesContent: true,
  companionTips: {
    low: 'Mit dem Finger unter den Buchstaben von rechts nach links fahren.',
    mid: 'Das Wort Buchstabe für Buchstabe rückwärts laut buchstabieren.',
    high: 'Lange Wörter in Silben zerlegen: erst das Ende, dann den Anfang.',
  },
  generate(ctx): Task<ReverseData> {
    const { level, random } = ctx
    const item = requireItem<WordPayload>(ctx, 'reverse')
    const fmt = (s: string) => upper(s)
    const word = fmt(item.payload.text)
    const shown = [...word].reverse().join('')
    const distractors = pickDistractors(item.payload.distractors, optionCount(level) - 1, level).map(fmt)
    const { options, correctIds } = choice(random, { label: word }, labels(distractors))
    return {
      exercise: 'reverse', level, select: 'single', itemId: item.id,
      prompt: band(level) === 'low' ? 'Welches Wort steht hier rückwärts?' : 'Welches Wort ist hier rückwärts geschrieben?',
      data: { shown },
      options, correctIds,
      hint: 'Lesen Sie das Wort von hinten nach vorne.',
      explanation: `„${shown}“ rückwärts gelesen ergibt „${word}“.`,
    }
  },
}
