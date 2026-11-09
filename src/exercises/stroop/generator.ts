import { band, optionCount } from '../levels'
import { pick, sample } from '../random'
import type { ExerciseDefinition, Task } from '../types'
import { choice } from '../build'
import { STROOP_COLORS, safeCompanions, type StroopColor } from './colors'

export interface StroopData {
  word: string // angezeigtes Farbwort
  inkVar: string // CSS-Variable der Schriftfarbe
  ink: StroopColor['id']
}

/**
 * Niveau 1–3: Wort und Farbe passen, „Welches Wort steht hier?“, 2 zur Wahl.
 * Niveau 4–7: Wort in fremder Farbe, Wort wählen, 3 zur Wahl.
 * Niveau 8–10: Schriftfarbe wählen, 4 zur Wahl.
 * Die Schriftfarbe ist nie mit einer angebotenen Farbe verwechselbar (Rot-Grün-Schwäche).
 */
export const stroop: ExerciseDefinition<StroopData> = {
  key: 'stroop',
  label: 'Farben lesen',
  icon: 'Palette',
  usesContent: false,
  companionTips: {
    low: 'Lesen Sie das Wort gemeinsam laut vor.',
    mid: 'Hier zählt nur, was dasteht – die Farbe darf man ignorieren.',
    high: 'Nur die Farbe der Buchstaben nennen. Ruhig erst laut sagen, dann tippen.',
  },
  generate({ level, random }): Task<StroopData> {
    const n = optionCount(level)
    const b = band(level)

    // Schriftfarbe mit genug unterscheidbaren Begleitfarben
    const inkCandidates = STROOP_COLORS.filter((c) => safeCompanions(c).length >= n - 1)
    const ink = pick(random, inkCandidates)
    const companions = sample(random, safeCompanions(ink), n - 1)

    if (b === 'low') {
      const { options, correctIds } = choice(random, { label: ink.name }, companions.map((c) => ({ label: c.name })))
      return {
        exercise: 'stroop', level, select: 'single',
        prompt: 'Welches Wort steht hier?',
        data: { word: ink.name, inkVar: ink.cssVar, ink: ink.id },
        options, correctIds,
        hint: 'Lesen Sie das Wort langsam Buchstabe für Buchstabe.',
        explanation: `Hier steht „${ink.name}“.`,
      }
    }

    // Wort passt nicht zur Farbe
    const word = pick(random, STROOP_COLORS.filter((c) => c.id !== ink.id))

    if (b === 'mid') {
      const others = sample(random, STROOP_COLORS.filter((c) => c.id !== word.id && c.id !== ink.id), n - 2)
      // Die Schriftfarbe als Ablenker anbieten: das ist die eigentliche Herausforderung.
      const { options, correctIds } = choice(random, { label: word.name }, [ink, ...others].map((c) => ({ label: c.name })))
      return {
        exercise: 'stroop', level, select: 'single',
        prompt: 'Welches Wort steht hier?',
        data: { word: word.name, inkVar: ink.cssVar, ink: ink.id },
        options, correctIds,
        hint: 'Achten Sie nur auf die Buchstaben, nicht auf die Farbe.',
        explanation: `Hier steht „${word.name}“, geschrieben in ${ink.name}.`,
      }
    }

    // Schwer: Schriftfarbe wählen; das Wort selbst ist oft unter den Antworten
    const distractors = companions.some((c) => c.id === word.id) || !safeCompanions(ink).some((c) => c.id === word.id)
      ? companions
      : [word, ...companions.slice(0, n - 2)]
    const { options, correctIds } = choice(random,
      { label: ink.name, swatch: ink.cssVar },
      distractors.map((c) => ({ label: c.name, swatch: c.cssVar })))
    return {
      exercise: 'stroop', level, select: 'single',
      prompt: 'Welche Farbe hat die Schrift?',
      data: { word: word.name, inkVar: ink.cssVar, ink: ink.id },
      options, correctIds,
      hint: 'Achten Sie nur auf die Farbe der Buchstaben, nicht auf das Wort.',
      explanation: `Das Wort „${word.name}“ ist in ${ink.name} geschrieben.`,
    }
  },
}
