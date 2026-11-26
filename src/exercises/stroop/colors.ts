import { confusable, CONFUSION_THRESHOLD, deltaE } from '@/design/color'

export interface StroopColor {
  id: 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange'
  name: string // Farbwort
  cssVar: string
  hex: string // muss zu tokens.css passen (Test); steht in allen Designs auf der dunklen Tafel --stroop-board
}

/** Kräftige, echt aussehende Farben. Damit auch Gelb leuchtet, liegt das Gitter immer auf einer dunklen Tafel. */
export const STROOP_COLORS: readonly StroopColor[] = [
  { id: 'red', name: 'Rot', cssVar: '--stroop-red', hex: '#ff4040' },
  { id: 'yellow', name: 'Gelb', cssVar: '--stroop-yellow', hex: '#ffd800' },
  { id: 'blue', name: 'Blau', cssVar: '--stroop-blue', hex: '#4d8dff' },
  { id: 'green', name: 'Grün', cssVar: '--stroop-green', hex: '#2fd05a' },
  { id: 'purple', name: 'Lila', cssVar: '--stroop-purple', hex: '#c47cff' },
  { id: 'orange', name: 'Orange', cssVar: '--stroop-orange', hex: '#ff9a1f' },
]

/** Bei Protanopie/Deuteranopie verwechselbar. */
export function colorsConfusable(a: StroopColor, b: StroopColor): boolean {
  return confusable(a.hex, b.hex)
}

/** Bei normalem Sehen klar unterscheidbar. */
export function colorsDistinct(a: StroopColor, b: StroopColor): boolean {
  return deltaE(a.hex, b.hex) >= CONFUSION_THRESHOLD
}
