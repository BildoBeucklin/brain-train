import { band, optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import type { ExerciseDefinition, Task } from '../types'

export interface ProverbPayload {
  start: string
  end: string
  distractors: string[] // falsche Enden, ähnlichstes zuerst
  meaning?: string // für Niveau 8–10
  meaningDistractors?: string[]
}

export interface ProverbData { start: string; end?: string; mode: 'complete' | 'meaning' }

/** 1–3: sehr bekannte ergänzen, 4–7: seltenere ergänzen, 8–10: Bedeutung wählen (betreut auch frei erklären). */
export const proverbs: ExerciseDefinition<ProverbData> = {
  key: 'proverbs',
  label: 'Sprichwörter',
  icon: 'Quote',
  usesContent: true,
  companionTips: {
    low: 'Den Anfang gemeinsam laut sprechen – das Ende kommt oft von selbst.',
    mid: 'Fragen Sie, wo man das Sprichwort früher gehört hat.',
    high: 'Nach einem Beispiel aus dem eigenen Leben fragen.',
  },
  generate(ctx): Task<ProverbData> {
    const { level, random } = ctx
    const n = optionCount(level) - 1
    const item = requireItem<ProverbPayload>(ctx, 'proverbs')
    const p = item.payload
    const full = `${p.start} ${p.end}`

    if (band(level) === 'high' && p.meaning && p.meaningDistractors?.length) {
      const { options, correctIds } = choice(random, { label: p.meaning }, labels(pickDistractors(p.meaningDistractors, n, level)))
      const open = ctx.assisted && random() < 0.3
      return {
        exercise: 'proverbs', level, select: 'single', itemId: item.id,
        prompt: 'Was bedeutet dieses Sprichwort?',
        data: { start: p.start, end: p.end, mode: 'meaning' },
        options, correctIds,
        hint: 'Denken Sie nicht an die Wörter, sondern an eine Situation aus dem Leben.',
        explanation: p.meaning,
        ...(open && { open: { prompt: 'Wie würden Sie das Sprichwort mit eigenen Worten erklären?' } }),
      }
    }

    const { options, correctIds } = choice(random, { label: p.end }, labels(pickDistractors(p.distractors, n, level)))
    return {
      exercise: 'proverbs', level, select: 'single', itemId: item.id,
      prompt: 'Wie geht das Sprichwort weiter?',
      data: { start: p.start, mode: 'complete' },
      options, correctIds,
      hint: 'Sprechen Sie den Anfang einmal laut. Wie geht es weiter?',
      explanation: p.meaning ? `„${full}“ – ${p.meaning}` : `„${full}“`,
    }
  },
}
