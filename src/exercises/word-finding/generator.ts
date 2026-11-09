import { band, optionCount, pickDistractors } from '../levels'
import { choice, labels, requireItem } from '../build'
import type { ExerciseDefinition, Task } from '../types'

export interface WordFindingPayload {
  question: string // 'Was gehört in die Küche?'
  answer: string
  distractors: string[]
  hint: string
  explanation?: string // z. B. 'Apfelkuchen'
  openPrompt?: string // betreut: frei sammeln
}

export interface WordFindingData { question: string }

/** 1–3: Kategorie, 4–7: Kategorie + Anfangsbuchstabe, 8–10: Wortteile; betreut auch frei sammeln. */
export const wordFinding: ExerciseDefinition<WordFindingData> = {
  key: 'wordFinding',
  label: 'Begriffe finden',
  icon: 'Search',
  usesContent: true,
  companionTips: {
    low: 'Beim Suchen an einen echten Ort denken lassen, z. B. die eigene Küche früher.',
    mid: 'Den Anfangsbuchstaben deutlich aussprechen.',
    high: 'Bei offenen Aufgaben jedes passende Wort loben, es gibt kein Falsch.',
  },
  generate(ctx): Task<WordFindingData> {
    const { level, random } = ctx
    const item = requireItem<WordFindingPayload>(ctx, 'wordFinding')
    const p = item.payload
    const { options, correctIds } = choice(random, { label: p.answer }, labels(pickDistractors(p.distractors, optionCount(level) - 1, level)))
    const open = band(level) === 'high' && ctx.assisted && p.openPrompt && random() < 0.3
    return {
      exercise: 'wordFinding', level, select: 'single', itemId: item.id,
      prompt: p.question,
      data: { question: p.question },
      options, correctIds,
      hint: p.hint,
      explanation: p.explanation ?? `Gesucht war „${p.answer}“.`,
      ...(open && { open: { prompt: p.openPrompt! } }),
    }
  },
}
