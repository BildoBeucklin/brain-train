import { START_LEVEL, type ExerciseId, type Level, type Skill } from '@/db/database'
import { clampLevel } from './levels'

export interface Result {
  correct: boolean
  tries: 1 | 2
  hint: boolean
}

export const UP_AFTER = 3 // saubere Treffer in Folge
export const DOWN_AFTER = 2 // Fehler in Folge
export const PAUSE_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Nach 3 sauberen Treffern in Folge +1, nach 2 Fehlern in Folge −1.
 * Treffer mit Hinweis oder im 2. Versuch zählt weder für den Aufstieg noch als Fehler.
 * Festgehaltenes Niveau (locked) bleibt unverändert.
 */
export function nextLevel(skill: Pick<Skill, 'level' | 'streak' | 'locked'>, r: Result): Pick<Skill, 'level' | 'streak'> {
  if (skill.locked) return { level: skill.level, streak: 0 }
  const clean = r.correct && r.tries === 1 && !r.hint
  let streak = clean ? Math.max(skill.streak, 0) + 1
    : r.correct ? 0
    : Math.min(skill.streak, 0) - 1
  let level = skill.level
  if (streak >= UP_AFTER) { level = clampLevel(level + 1); streak = 0 }
  if (streak <= -DOWN_AFTER) { level = clampLevel(level - 1); streak = 0 }
  return { level, streak }
}

/** Neues Profil: Niveau 2 in jeder Übung. */
export function initialSkill(profileId: number, exercise: ExerciseId, now: number): Skill {
  return { profileId, exercise, level: START_LEVEL, streak: 0, lastAt: now }
}

/** Niveau, mit dem eine Übung heute startet: nach mehr als 14 Tagen Pause eins tiefer. */
export function effectiveLevel(skill: Pick<Skill, 'level' | 'lastAt' | 'locked'>, now: number): Level {
  if (skill.locked) return skill.level
  return now - skill.lastAt > PAUSE_DAYS * DAY_MS ? clampLevel(skill.level - 1) : skill.level
}
