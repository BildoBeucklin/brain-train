import type { Attempt, ExerciseId, Level, Session, Skill } from '@/db/database'

/** Verlauf für die Begleitperson: geübte Minuten pro Woche und Niveau je Übung. Keine Punkte, keine Bewertung. */

export interface WeekMinutes {
  weekStart: number // Montag 00:00 (lokal)
  label: string // 'KW 45'
  alone: number // Minuten
  assisted: number
}

export function mondayOf(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export function isoWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/**
 * Aktive Trainingszeit einer Einheit: gespeicherte activeMs (ohne Pausen);
 * fehlt sie (z. B. Programm geschlossen), die Summe der Antwortzeiten.
 */
export function sessionMinutes(s: Session, attempts: readonly Attempt[]): number {
  const ms = s.activeMs ?? attempts.filter((a) => a.sessionId === s.id).reduce((sum, a) => sum + Math.min(a.ms, 5 * 60_000), 0)
  return ms / 60_000
}

/** Minuten je Woche der letzten `weeks` Wochen, getrennt nach allein und betreut. */
export function minutesPerWeek(sessions: readonly Session[], attempts: readonly Attempt[], now: number, weeks = 8): WeekMinutes[] {
  const thisMonday = mondayOf(now)
  const result: WeekMinutes[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday)
    d.setDate(d.getDate() - 7 * i)
    result.push({ weekStart: d.getTime(), label: `KW ${isoWeek(d.getTime())}`, alone: 0, assisted: 0 })
  }
  for (const s of sessions) {
    const w = result.find((r) => r.weekStart === mondayOf(s.startedAt))
    if (!w) continue
    w[s.mode === 'assisted' ? 'assisted' : 'alone'] += sessionMinutes(s, attempts)
  }
  for (const w of result) { w.alone = Math.round(w.alone); w.assisted = Math.round(w.assisted) }
  return result
}

export interface ExerciseLevel { exercise: ExerciseId; level: Level; locked: boolean; lastAt?: number; practiced: number }

export function levelsByExercise(skills: readonly Skill[], attempts: readonly Attempt[], exercises: readonly ExerciseId[]): ExerciseLevel[] {
  return exercises.map((exercise) => {
    const s = skills.find((k) => k.exercise === exercise)
    const mine = attempts.filter((a) => a.exercise === exercise)
    return {
      exercise,
      level: s?.level ?? 2,
      locked: !!s?.locked,
      lastAt: mine.length ? Math.max(...mine.map((a) => a.at)) : undefined,
      practiced: mine.length,
    }
  })
}
