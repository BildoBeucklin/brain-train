import type { ExerciseId } from './types'
import { shuffle } from './random'

export const WARMUP_TASKS = 3
export const BLOCK_TASKS = 5

export type PlanStep =
  | { type: 'task'; exercise: ExerciseId; levelOffset: 0 | -1; warmup: boolean; index: number; of: number }
  | { type: 'break' } // Zwischenbildschirm nach jedem Block
  | { type: 'end' } // Abschlussbildschirm

export interface PlannerOptions {
  exercises: readonly ExerciseId[]
  favorite?: ExerciseId // für das Aufwärmen, z. B. meistgeübte Übung
  sessionMs: number // Standard 15 Minuten
  random: () => number
}

/**
 * Ablauf einer Einheit: Aufwärmen (3 Aufgaben der Lieblingsübung, ein Niveau tiefer),
 * danach Blöcke von 5 Aufgaben mit wechselnder Übung. Ist die Zeit um, endet der laufende Block.
 * Zeit wird von außen übergeben (now), damit Pausen nicht mitzählen und Tests deterministisch sind.
 */
export class Planner {
  private queue: ExerciseId[] = []
  private current: ExerciseId | null = null
  private inBlock = 0
  private warmupLeft: number
  private pendingBreak = false
  private ended = false
  readonly favorite: ExerciseId

  constructor(private readonly opts: PlannerOptions) {
    if (opts.exercises.length === 0) throw new Error('Planner: keine Übungen')
    this.favorite = opts.favorite && opts.exercises.includes(opts.favorite) ? opts.favorite : opts.exercises[0]!
    this.warmupLeft = WARMUP_TASKS
  }

  /** elapsedMs: reine Trainingszeit ohne Pausen. */
  next(elapsedMs: number): PlanStep {
    if (this.ended) return { type: 'end' }

    if (this.warmupLeft > 0) {
      const index = WARMUP_TASKS - this.warmupLeft
      this.warmupLeft--
      return { type: 'task', exercise: this.favorite, levelOffset: -1, warmup: true, index, of: WARMUP_TASKS }
    }

    if (this.pendingBreak) {
      this.pendingBreak = false
      if (elapsedMs >= this.opts.sessionMs) { this.ended = true; return { type: 'end' } }
      return { type: 'break' }
    }

    if (this.inBlock === 0) this.current = this.nextExercise()
    const index = this.inBlock
    this.inBlock++
    if (this.inBlock === BLOCK_TASKS) { this.inBlock = 0; this.pendingBreak = true }
    return { type: 'task', exercise: this.current!, levelOffset: 0, warmup: false, index, of: BLOCK_TASKS }
  }

  /** Begleitperson beendet vorzeitig. */
  finish(): void { this.ended = true }

  private nextExercise(): ExerciseId {
    if (this.queue.length === 0) {
      let q = shuffle(this.opts.random, this.opts.exercises)
      // nicht zweimal dieselbe Übung direkt hintereinander (auch nicht nach dem Aufwärmen)
      const last = this.current ?? this.favorite
      if (q.length > 1 && q[0] === last) q = [...q.slice(1), q[0]!]
      this.queue = q
    }
    return this.queue.shift()!
  }
}
