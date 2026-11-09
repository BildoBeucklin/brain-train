import type { ExerciseId, ItemRow, Level } from '@/db/database'

export type { ExerciseId, Level }

export interface Option {
  id: string
  label: string
  /** Farbübung: CSS-Variable des Farbfelds, z. B. '--stroop-red' */
  swatch?: string
  /** Merken: Name des Lucide-Icons der Karte */
  icon?: string
}

export interface Task<D = unknown> {
  exercise: ExerciseId
  level: Level
  prompt: string // 'Welches Wort steht hier auf dem Kopf?'
  data: D // was die Prompt-Komponente zeigt
  options: Option[]
  /** 'single': eine Antwort antippen. 'multi': mehrere antippen und „Fertig“ (Merken). */
  select: 'single' | 'multi'
  correctIds: string[] // bei 'single' genau eine
  hint: string // nach dem 1. Fehler
  explanation?: string // nach dem 2. Fehler bzw. bei der Auflösung
  memorize?: { prompt: string; items: string[] } // Merken: erst einprägen, dann fragen
  open?: { prompt: string } // offene Aufgabe, nur betreut; Wertung durch die Begleitperson
  itemId?: number
}

export type DrawFn = <P>(exercise: ExerciseId, level: Level) => ItemRow<P> | undefined
export type PoolFn = <P>(exercise: ExerciseId, level: Level) => ItemRow<P>[]

export interface GenerateContext {
  level: Level
  random: () => number // injizierbar, damit Tests deterministisch sind
  draw: DrawFn // nächster Inhalt aus der Shuffle-Bag
  pool: PoolFn // alle passenden Inhalte, z. B. für Ablenker
  assisted?: boolean // betreut: offene Varianten erlaubt
}

export type ExerciseBand = 'low' | 'mid' | 'high'

export interface ExerciseDefinition<D = unknown> {
  key: ExerciseId
  label: string // 'Farben lesen'
  icon: string // Name des Lucide-Icons; die UI löst ihn auf
  usesContent: boolean
  companionTips: Record<ExerciseBand, string>
  generate(ctx: GenerateContext): Task<D>
}

/** Prüft eine Auswahl gegen die Lösung (Reihenfolge egal). */
export function isCorrect(task: Task, selected: readonly string[]): boolean {
  const s = new Set(selected)
  return s.size === task.correctIds.length && task.correctIds.every((id) => s.has(id))
}
