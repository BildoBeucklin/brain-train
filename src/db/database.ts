import Dexie, { type Table } from 'dexie'

export type ExerciseId =
  | 'stroop' | 'upsideDown' | 'reverse' | 'proverbs'
  | 'oddOneOut' | 'opposites' | 'wordFinding' | 'memory' | 'math'
export type Level = 0 | 1 | 2

export interface ItemRow<P = unknown> {
  id?: number
  exercise: ExerciseId
  level: Level
  payload: P
  source: 'seed' | 'user'
  enabled: 0 | 1 // Zahl statt boolean, damit indizierbar
  seedKey?: string // stabile ID der Standardinhalte für Updates
}

export interface SettingRow { key: string; value: unknown }
export interface SessionRow { id?: number; startedAt: number; endedAt?: number }
export interface SessionEventRow {
  id?: number
  sessionId: number
  at: number
  exercise: ExerciseId
  level: Level
  itemId?: number
}

export class GsDatabase extends Dexie {
  items!: Table<ItemRow, number>
  settings!: Table<SettingRow, string>
  sessions!: Table<SessionRow, number>
  sessionEvents!: Table<SessionEventRow, number>

  constructor(name = 'gedaechtnisstunde') {
    super(name)
    this.version(1).stores({
      items: '++id, [exercise+level], exercise, source, enabled, seedKey',
      settings: 'key',
      sessions: '++id, startedAt',
      sessionEvents: '++id, sessionId, [sessionId+at]',
    })
  }
}

export const db = new GsDatabase()

/** Bittet Browser/WebView2, die Daten nicht automatisch zu räumen. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
