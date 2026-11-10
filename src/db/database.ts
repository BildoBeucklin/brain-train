import Dexie, { type Table } from 'dexie'

export type ExerciseId =
  | 'stroop' | 'upsideDown' | 'reverse' | 'proverbs'
  | 'oddOneOut' | 'opposites' | 'wordFinding' | 'memory' | 'math'

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const MIN_LEVEL: Level = 1
export const MAX_LEVEL: Level = 10
export const START_LEVEL: Level = 2

/** Pseudonymes Profil: Rufname und Symbol, kein Nachname. */
export interface Profile {
  id?: number
  name: string
  icon: string // Name eines Lucide-Icons, z. B. 'Flower2'
  color: string
  createdAt: number
}

export interface Skill {
  profileId: number
  exercise: ExerciseId
  level: Level
  streak: number // +n = n richtig in Folge, -n = n falsch in Folge
  locked?: boolean // Niveau von der Begleitperson festgehalten
  lastAt: number
}

export interface Attempt {
  id?: number
  sessionId: number
  profileId: number
  exercise: ExerciseId
  level: Level
  correct: boolean
  tries: 1 | 2 // beim 2. Fehlversuch wird die Lösung gezeigt
  hint: boolean // Hinweis genutzt (selbst oder Begleitperson)
  assisted: boolean // im betreuten Modus beantwortet
  ms: number
  at: number
}

export interface Session {
  id?: number
  profileId: number
  mode: 'alone' | 'assisted'
  startedAt: number
  endedAt?: number
  activeMs?: number // Trainingszeit ohne Pausen (nicht indiziert, kein Schemawechsel nötig)
}

export interface ItemRow<P = unknown> {
  id?: number
  exercise: ExerciseId
  minLevel: Level // ab welchem Niveau der Inhalt vorkommt
  maxLevel: Level
  payload: P // z. B. { start, end, distractors: ['…', '…', '…'] }
  source: 'seed' | 'user'
  enabled: 0 | 1 // Zahl statt boolean, damit indizierbar
  seedKey?: string // stabile ID der Standardinhalte für Updates
}

export interface SettingRow { key: string; value: unknown }

export class GsDatabase extends Dexie {
  profiles!: Table<Profile, number>
  skills!: Table<Skill, [number, ExerciseId]>
  attempts!: Table<Attempt, number>
  sessions!: Table<Session, number>
  items!: Table<ItemRow, number>
  settings!: Table<SettingRow, string>

  constructor(name = 'gedaechtnisstunde') {
    super(name)
    this.version(1).stores({
      profiles: '++id, name',
      skills: '[profileId+exercise], profileId',
      // profileId zusätzlich indiziert, damit "Profil löschen" alle Versuche findet
      attempts: '++id, sessionId, profileId, [profileId+exercise+at]',
      sessions: '++id, profileId, startedAt',
      items: '++id, exercise, [exercise+minLevel], source, enabled, seedKey',
      settings: 'key',
    })
  }

  /** Entfernt ein Profil samt Niveaus, Versuchen und Einheiten. */
  deleteProfile(profileId: number): Promise<void> {
    return this.transaction('rw', [this.profiles, this.skills, this.attempts, this.sessions], async () => {
      await this.skills.where('profileId').equals(profileId).delete()
      await this.attempts.where('profileId').equals(profileId).delete()
      await this.sessions.where('profileId').equals(profileId).delete()
      await this.profiles.delete(profileId)
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
