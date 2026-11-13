import type { ExerciseId } from '@/db/database'
import type { ExerciseDefinition } from './types'
import { stroop } from './stroop/generator'
import { mirror } from './mirror/generator'
import { shopping } from './shopping/generator'
import { upsideDown } from './upside-down/generator'
import { reverse } from './reverse/generator'
import { proverbs } from './proverbs/generator'
import { oddOneOut } from './odd-one-out/generator'
import { opposites } from './opposites/generator'
import { wordFinding } from './word-finding/generator'
import { memory } from './memory/generator'
import { math } from './math/generator'

/** Alle Übungen. Eine neue Übung wird nur hier eingetragen. */
export const registry: Record<ExerciseId, ExerciseDefinition<any>> = {
  stroop, upsideDown, reverse, proverbs, oddOneOut, opposites, wordFinding, memory, math, mirror, shopping,
}

export const EXERCISE_IDS = Object.keys(registry) as ExerciseId[]
