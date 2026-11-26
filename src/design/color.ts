/** Kontrast (WCAG 2.x) und Farbsehschwäche-Simulation (Viénot/Brettel 1999). Reine Funktionen. */

type Rgb = [number, number, number]

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb
}
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export type Deficiency = 'protan' | 'deutan'

const MATRICES: Record<Deficiency, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
}

function simulateLinear(hex: string, d?: Deficiency): Rgb {
  const c = hexToRgb(hex).map(toLinear) as Rgb
  if (!d) return c
  return MATRICES[d].map((row) =>
    Math.min(1, Math.max(0, row[0]! * c[0] + row[1]! * c[1] + row[2]! * c[2]))) as Rgb
}

function linearToLab([r, g, b]: Rgb): Rgb {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

/** Farbabstand ΔE (CIE76), optional so, wie ihn eine Person mit Farbsehschwäche sieht. */
export function deltaE(a: string, b: string, d?: Deficiency): number {
  const [p, q] = [linearToLab(simulateLinear(a, d)), linearToLab(simulateLinear(b, d))]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/** Unter diesem Abstand gelten zwei Farben als verwechselbar. */
export const CONFUSION_THRESHOLD = 20

export function confusable(a: string, b: string): boolean {
  return [undefined, 'protan', 'deutan'].some(
    (d) => deltaE(a, b, d as Deficiency | undefined) < CONFUSION_THRESHOLD)
}
