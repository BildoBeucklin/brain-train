import { confusable, CONFUSION_THRESHOLD, deltaE } from '@/design/color'

export interface StroopColor {
  id: 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'brown' | 'yellow' | 'pink' | 'gray' | 'turquoise'
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
  { id: 'yellow', name: 'Gelb', cssVar: '--stroop-yellow', light: '#8a6d00', dark: '#ffe066' },
  { id: 'pink', name: 'Rosa', cssVar: '--stroop-pink', light: '#c2187a', dark: '#ff8fd0' },
  { id: 'gray', name: 'Grau', cssVar: '--stroop-gray', light: '#5a5a5a', dark: '#bdbdbd' },
  { id: 'turquoise', name: 'Türkis', cssVar: '--stroop-turquoise', light: '#00797a', dark: '#5fe0e0' },
]

/** Zwei Farben sind verwechselbar, wenn sie es in Hell oder Dunkel bei Protanopie/Deuteranopie sind. */
export function colorsConfusable(a: StroopColor, b: StroopColor): boolean {
  return confusable(a.light, b.light) || confusable(a.dark, b.dark)
}

/** Farben, die neben der Schriftfarbe c angeboten werden dürfen. */
export function safeCompanions(c: StroopColor): StroopColor[] {
  return STROOP_COLORS.filter((o) => o.id !== c.id && !colorsConfusable(c, o))
}

/** Bei normalem Sehen klar unterscheidbar (hell und dunkel). */
export function colorsDistinct(a: StroopColor, b: StroopColor): boolean {
  return deltaE(a.light, b.light) >= CONFUSION_THRESHOLD && deltaE(a.dark, b.dark) >= CONFUSION_THRESHOLD
}
