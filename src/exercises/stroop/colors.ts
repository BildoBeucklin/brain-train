import { confusable } from '@/design/color'

export interface StroopColor {
  id: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown'
  name: string // Farbwort
  cssVar: string
  light: string // muss zu tokens.css passen (Test)
  dark: string
}

export const STROOP_COLORS: readonly StroopColor[] = [
  { id: 'red', name: 'Rot', cssVar: '--stroop-red', light: '#c42525', dark: '#ff8a80' },
  { id: 'blue', name: 'Blau', cssVar: '--stroop-blue', light: '#1b4fb8', dark: '#8db1ff' },
  { id: 'green', name: 'Grün', cssVar: '--stroop-green', light: '#2a7a33', dark: '#73d48f' },
  { id: 'orange', name: 'Orange', cssVar: '--stroop-orange', light: '#a84e00', dark: '#ffaa5c' },
  { id: 'purple', name: 'Lila', cssVar: '--stroop-purple', light: '#7a3ba8', dark: '#cda6f0' },
  { id: 'brown', name: 'Braun', cssVar: '--stroop-brown', light: '#7a4a20', dark: '#d9aa80' },
]

/** Zwei Farben sind verwechselbar, wenn sie es in Hell oder Dunkel bei Protanopie/Deuteranopie sind. */
export function colorsConfusable(a: StroopColor, b: StroopColor): boolean {
  return confusable(a.light, b.light) || confusable(a.dark, b.dark)
}

/** Farben, die neben der Schriftfarbe c angeboten werden dürfen. */
export function safeCompanions(c: StroopColor): StroopColor[] {
  return STROOP_COLORS.filter((o) => o.id !== c.id && !colorsConfusable(c, o))
}
