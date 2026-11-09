import { band } from '../levels'
import { choice, labels, requireItem } from '../build'
import { sample } from '../random'
import type { ExerciseDefinition, Task } from '../types'

export interface OddOneOutPayload {
  members: string[] // mindestens 4, gehören zusammen
  odd: string
  explanation: string // 'Ein Hammer ist kein Obst.'
}

export interface OddOneOutData { cards: number }

/** 1–3: 3 Karten, klare Kategorie; 4–7: 4 Karten; 8–10: 5 Karten, Wissen nötig. */
export const oddOneOut: ExerciseDefinition<OddOneOutData> = {
  key: 'oddOneOut',
  label: 'Was passt nicht?',
  icon: 'Shapes',
  usesContent: true,
  companionTips: {
    low: 'Fragen Sie: „Was davon kann man essen?“ oder Ähnliches.',
    mid: 'Gemeinsam überlegen, was drei der Dinge verbindet.',
    high: 'Ruhig nach der Begründung fragen – auch andere Lösungen können sinnvoll sein.',
  },
  generate(ctx): Task<OddOneOutData> {
    const { level, random } = ctx
    const cards = ({ low: 3, mid: 4, high: 5 } as const)[band(level)]
    const item = requireItem<OddOneOutPayload>(ctx, 'oddOneOut')
    const members = sample(random, item.payload.members, cards - 1)
    const { options, correctIds } = choice(random, { label: item.payload.odd }, labels(members))
    return {
      exercise: 'oddOneOut', level, select: 'single', itemId: item.id,
      prompt: 'Was passt nicht dazu?',
      data: { cards: options.length },
      options, correctIds,
      hint: `${cards - 1} Dinge gehören zusammen. Was haben sie gemeinsam?`,
      explanation: item.payload.explanation,
    }
  },
}
