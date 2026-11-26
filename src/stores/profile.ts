import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { db, START_LEVEL, type ExerciseId, type Level, type Profile, type Skill } from '@/db/database'
import { EXERCISE_IDS } from '@/exercises/registry'

export type ProfileSymbol = 'flower' | 'sun' | 'bird' | 'cat' | 'anchor' | 'coffee'
export const PROFILE_SYMBOLS: readonly { id: ProfileSymbol; label: string }[] = [
  { id: 'flower', label: 'Blume' },
  { id: 'sun', label: 'Sonne' },
  { id: 'bird', label: 'Vogel' },
  { id: 'cat', label: 'Katze' },
  { id: 'anchor', label: 'Anker' },
  { id: 'coffee', label: 'Kaffeetasse' },
]

export const useProfileStore = defineStore('profile', () => {
  const profiles = shallowRef<Profile[]>([])
  const currentId = ref<number | null>(null)
  const skills = ref(new Map<ExerciseId, Skill>())

  const current = computed(() => profiles.value.find((p) => p.id === currentId.value) ?? null)

  async function load(): Promise<void> {
    profiles.value = await db.profiles.orderBy('id').toArray()
  }

  async function create(name: string, icon: ProfileSymbol): Promise<number> {
    const id = await db.profiles.add({ name: name.trim(), icon, color: icon, createdAt: Date.now() })
    await load()
    return id
  }

  async function remove(id: number): Promise<void> {
    await db.deleteProfile(id)
    if (currentId.value === id) currentId.value = null
    await load()
  }

  /** Wählt ein Profil und lädt die Niveaus; fehlende Übungen starten auf Niveau 2. */
  async function select(id: number, now = Date.now()): Promise<void> {
    const stored = await db.skills.where('profileId').equals(id).toArray()
    const map = new Map(stored.map((s) => [s.exercise, s]))
    const fresh: Skill[] = []
    for (const exercise of EXERCISE_IDS) {
      if (map.has(exercise)) continue
      const s: Skill = { profileId: id, exercise, level: START_LEVEL, streak: 0, lastAt: now }
      map.set(exercise, s); fresh.push(s)
    }
    if (fresh.length) await db.skills.bulkPut(fresh)
    skills.value = map
    currentId.value = id
  }

  function levelOf(exercise: ExerciseId): Level {
    return skills.value.get(exercise)?.level ?? 2
  }

  /** Merkt sich, wann die Übung zuletzt geübt wurde. Das Niveau bleibt unverändert. */
  async function markPracticed(exercise: ExerciseId, now = Date.now()): Promise<void> {
    const s = skills.value.get(exercise)
    if (!s) throw new Error('Kein Profil gewählt')
    const updated: Skill = { ...s, lastAt: now }
    skills.value.set(exercise, updated)
    await db.skills.put(updated)
  }

  /** Begleitperson: Niveau direkt setzen bzw. festhalten. */
  async function setLevel(exercise: ExerciseId, level: Level, locked?: boolean): Promise<Skill> {
    const s = skills.value.get(exercise)
    if (!s) throw new Error('Kein Profil gewählt')
    const updated: Skill = { ...s, level, streak: 0, ...(locked !== undefined && { locked }) }
    skills.value.set(exercise, updated)
    await db.skills.put(updated)
    return updated
  }

  function isLocked(exercise: ExerciseId): boolean {
    return !!skills.value.get(exercise)?.locked
  }

  /** Hat das Profil schon einmal trainiert? Neue Profile starten betreut. */
  async function hasSessions(id: number): Promise<boolean> {
    return (await db.sessions.where('profileId').equals(id).count()) > 0
  }

  /** Meistgeübte Übung des Profils, fürs Aufwärmen. */
  async function favorite(): Promise<ExerciseId | undefined> {
    if (currentId.value == null) return undefined
    const counts = new Map<ExerciseId, number>()
    await db.attempts.where('profileId').equals(currentId.value).each((a) => {
      counts.set(a.exercise, (counts.get(a.exercise) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }

  return { profiles, current, currentId, skills, load, create, remove, select, levelOf, markPracticed, favorite, setLevel, isLocked, hasSessions }
})
