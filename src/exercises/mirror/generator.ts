import { band, withinBand } from '../levels'
import { sample, shuffle } from '../random'
import type { ExerciseDefinition, Option, Task } from '../types'

/** Nur seitlich bzw. schräg gezeichnete, also deutlich spiegelbare Motive. Mindestens 25 (5×5 ohne Doppelte). */
export const MIRROR_PICTURES = [
  { name: 'Vogel', icon: 'Bird' },
  { name: 'Fisch', icon: 'Fish' },
  { name: 'Hase', icon: 'Rabbit' },
  { name: 'Ratte', icon: 'Rat' },
  { name: 'Schnecke', icon: 'Snail' },
  { name: 'Eichhörnchen', icon: 'Squirrel' },
  { name: 'Schildkröte', icon: 'Turtle' },
  { name: 'Garnele', icon: 'Shrimp' },
  { name: 'Wurm', icon: 'Worm' },
  { name: 'Kranich', icon: 'Origami' },
  { name: 'Feder', icon: 'Feather' },
  { name: 'Krankenwagen', icon: 'Ambulance' },
  { name: 'Bierkrug', icon: 'Beer' },
  { name: 'Auto', icon: 'Car' },
  { name: 'Wohnwagen', icon: 'Caravan' },
  { name: 'Bohrmaschine', icon: 'Drill' },
  { name: 'Fahne', icon: 'Flag' },
  { name: 'Taschenlampe', icon: 'Flashlight' },
  { name: 'Gabelstapler', icon: 'Forklift' },
  { name: 'Gitarre', icon: 'Guitar' },
  { name: 'Hammer', icon: 'Hammer' },
  { name: 'Megafon', icon: 'Megaphone' },
  { name: 'Mond', icon: 'Moon' },
  { name: 'Bleistift', icon: 'Pencil' },
  { name: 'Flugzeug', icon: 'Plane' },
  { name: 'Rakete', icon: 'Rocket' },
  { name: 'Segelboot', icon: 'Sailboat' },
  { name: 'Fernrohr', icon: 'Telescope' },
  { name: 'Daumen hoch', icon: 'ThumbsUp' },
  { name: 'Traktor', icon: 'Tractor' },
  { name: 'Lastwagen', icon: 'Truck' },
] as const

export interface MirrorData {
  cols: number
  /** Linke Box: Originale, zeilenweise */
  left: string[]
  /** Rechte Box: Spiegelbild der linken (Platz i zeigt left[gespiegelter Platz]); plain = nicht gespiegelt */
  right: { icon: string; plain: boolean }[]
}

/** Raster und Anzahl der nicht gespiegelten Bilder je Stufe. */
const SETUP = {
  low: { cols: 3, odd: [1, 2] },
  mid: { cols: 4, odd: [2, 3] },
  high: { cols: 5, odd: [3, 4] },
} as const

/**
 * Links eine Box mit Bildern, rechts dieselbe Box gespiegelt (ab Niveau 8 zusätzlich durcheinander). Einige Bilder rechts sind nicht gespiegelt:
 * Diese antippen, dann „Ja, das war alles“. Ein Versuch; danach werden Treffer, Fehlgriffe und Übersehenes gezeigt.
 */
export const mirror: ExerciseDefinition<MirrorData> = {
  key: 'mirror',
  label: 'Spiegelbilder',
  icon: 'FlipHorizontal2',
  usesContent: false,
  companionTips: {
    low: 'Zeigen Sie auf ein Bild links und suchen Sie es gemeinsam rechts.',
    mid: 'Reihe für Reihe vorgehen: Schaut das Bild rechts in die andere Richtung?',
    high: 'Die Bilder sind durcheinander: Erst jedes Bild links rechts suchen, dann die Richtung vergleichen.',
  },
  generate({ level, random }): Task<MirrorData> {
    const b = band(level)
    const { cols, odd } = SETUP[b]
    const n = cols * cols
    const left = sample(random, MIRROR_PICTURES, n).map((p) => p.icon) // jedes Bild nur einmal
    const oddCount = withinBand(level) < 0.5 ? odd[0] : odd[1]
    const plainAt = new Set(sample(random, Array.from({ length: n }, (_, i) => i), oddCount))
    // Niveau 1–7: Platz (r, c) rechts zeigt Platz (r, cols-1-c) links – wie in einem Spiegel.
    // Niveau 8–10: rechts dieselben Bilder, aber über das ganze Feld gemischt (auch über Reihen hinweg).
    const mirrored = Array.from({ length: n }, (_, i) => left[Math.floor(i / cols) * cols + (cols - 1 - (i % cols))]!)
    const order = b === 'high' ? shuffle(random, mirrored) : mirrored
    const right = order.map((icon, i) => ({ icon, plain: plainAt.has(i) }))
    const options: Option[] = right.map((_, i) => ({
      id: `p${i}`, label: `Reihe ${Math.floor(i / cols) + 1}, Platz ${(i % cols) + 1}`,
    }))
    const correctIds = [...plainAt].sort((a, z) => a - z).map((i) => `p${i}`)
    return {
      exercise: 'mirror', level, select: 'multi', custom: true, singleTry: true,
      submitLabel: 'Ja, das war alles',
      prompt: oddCount === 1
        ? 'Rechts ist ein Bild nicht gespiegelt. Tippen Sie es an.'
        : 'Rechts sind einige Bilder nicht gespiegelt. Tippen Sie sie an.',
      data: { cols, left, right },
      options, correctIds,
      hint: 'Ein Spiegelbild schaut in die andere Richtung als das Bild links.',
      explanation: `Nicht gespiegelt ${oddCount === 1 ? 'war 1 Bild' : `waren ${oddCount} Bilder`} – rechts markiert.`,
    }
  },
}
