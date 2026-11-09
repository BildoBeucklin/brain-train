import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { db, type ExerciseId, type Level, type Profile, type Skill } from '@/db/database'
import { effectiveLevel, initialSkill, nextLevel, type Result } from '@/exercises/adaptive'
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

  /** Wählt ein Profil und lädt die Niveaus; fehlende Übungen starten auf Niveau 2, nach langer Pause eins tiefer. */
  async function select(id: number, now = Date.now()): Promise<void> {
    const stored = await db.skills.where('profileId').equals(id).toArray()
    const map = new Map(stored.map((s) => [s.exercise, s]))
    const changed: Skill[] = []
    for (const ex of EXERCISE_IDS) {
      const s = map.get(ex)
      if (!s) {
        const fresh = initialSkill(id, ex, now)
        map.set(ex, fresh); changed.push(fresh)
      } else {
        const level = effectiveLevel(s, now)
        if (level !== s.level) {
          const lowered = { ...s, level, streak: 0, lastAt: now }
          map.set(ex, lowered); changed.push(lowered)
        }
      }
    }
    if (changed.length) await db.skills.bulkPut(changed)
    skills.value = map
    currentId.value = id
  }

  function levelOf(exercise: ExerciseId): Level {
    return skills.value.get(exercise)?.level ?? 2
  }

  async function applyResult(exercise: ExerciseId, result: Result, now = Date.now()): Promise<Skill> {
    const s = skills.value.get(exercise)
    if (!s) throw new Error('Kein Profil gewählt')
    const updated: Skill = { ...s, ...nextLevel(s, result), lastAt: now }
    skills.value.set(exercise, updated)
    await db.skills.put(updated)
    return updated
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

  return { profiles, current, currentId, skills, load, create, remove, select, levelOf, applyResult, favorite }
})
