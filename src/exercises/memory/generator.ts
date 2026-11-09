import { band, withinBand } from '../levels'
import { NoContentError } from '../build'
import { randInt, sample, shuffle } from '../random'
import type { ExerciseDefinition, Option, Task } from '../types'

export interface MemoryPayload { thing: string; icon?: string } // icon: Lucide-Name für die Karte

export interface MemoryData {
  shown: string[]
  icons: Record<string, string | undefined> // Ding → Lucide-Icon
}

/**
 * 1–3: 2 Dinge, dann „War das dabei?“ Ja/Nein.
 * 4–7: 3–4 Dinge aus 6 antippen. 8–10: 5–7 Dinge aus 9 antippen.
 */
export const memory: ExerciseDefinition<MemoryData> = {
  key: 'memory',
  label: 'Merken',
  icon: 'Brain',
  usesContent: true,
  companionTips: {
    low: 'Die Dinge gemeinsam laut benennen, bevor sie verschwinden.',
    mid: 'Eine kleine Geschichte zu den Dingen erfinden hilft beim Merken.',
    high: 'Nach Orten fragen: Wo liegt der Schlüssel, wo die Brille?',
  },
  generate(ctx): Task<MemoryData> {
    const { level, random } = ctx
    const pool = ctx.pool<MemoryPayload>('memory', level)
    const b = band(level)
    const shownCount = b === 'low' ? 2 : b === 'mid' ? (withinBand(level) < 0.5 ? 3 : 4) : randInt(random, 5, 5 + Math.round(withinBand(level) * 2))
    const total = b === 'low' ? shownCount + 1 : b === 'mid' ? 6 : 9
    if (pool.length < total) throw new NoContentError('memory', level)

    const picked = sample(random, pool, total)
    const chosen = picked.map((i) => i.payload.thing)
    const icons = Object.fromEntries(picked.map((i) => [i.payload.thing, i.payload.icon]))
    const shown = chosen.slice(0, shownCount)
    const memorize = { prompt: `Merken Sie sich diese ${shownCount} Dinge`, items: shown }

    if (b === 'low') {
      // Ja/Nein: mal ein gezeigtes, mal ein neues Ding abfragen
      const asked = random() < 0.5 ? shown[0]! : chosen[shownCount]!
      const wasShown = shown.includes(asked)
      const yes = { label: 'Ja' }, no = { label: 'Nein' }
      const options: Option[] = [{ id: 'a', ...yes }, { id: 'b', ...no }]
      return {
        exercise: 'memory', level, select: 'single', memorize,
        prompt: `War „${asked}“ dabei?`,
        data: { shown, icons },
        options, correctIds: [wasShown ? 'a' : 'b'],
        hint: 'Denken Sie an die Bilder vom Anfang zurück.',
        explanation: `Gezeigt wurden: ${shown.join(', ')}.`,
      }
    }

    const ordered = shuffle(random, chosen).map((thing, i) => ({ id: 'abcdefghi'[i]!, label: thing, icon: icons[thing] }))
    return {
      exercise: 'memory', level, select: 'multi', memorize,
      prompt: 'Welche Dinge haben Sie gesehen? Tippen Sie alle an.',
      data: { shown, icons },
      options: ordered,
      correctIds: ordered.filter((o) => shown.includes(o.label)).map((o) => o.id),
      hint: `Es waren ${shownCount} Dinge. Denken Sie an die Bilder vom Anfang zurück.`,
      explanation: `Gezeigt wurden: ${shown.join(', ')}.`,
    }
  },
}
