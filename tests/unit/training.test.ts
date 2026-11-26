import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/db/database'
import { useContentStore } from '@/stores/content'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'

async function setup(level?: number) {
  setActivePinia(createPinia())
  await db.delete()
  await db.open()
  await useSettingsStore().load()
  await useContentStore().load()
  const profile = useProfileStore()
  const id = await profile.create('Maria', 'flower')
  if (level) {
    const { EXERCISE_IDS } = await import('@/exercises/registry')
    await db.skills.bulkPut(EXERCISE_IDS.map((exercise) => ({ profileId: id, exercise, level: level as 5, streak: 0, lastAt: Date.now() })))
  }
  const training = useTrainingStore()
  await training.start(id, 'alone')
  training.begin()
  return { training, profile, id }
}

const wrongId = (t: ReturnType<typeof useTrainingStore>) => t.task!.options.find((o) => !t.task!.correctIds.includes(o.id))!.id

/** Bis zu einer Einzelauswahl-Aufgabe weiterspringen. */
function toSingleTask(t: ReturnType<typeof useTrainingStore>) {
  for (let i = 0; i < 100 && (t.task?.select !== 'single' || t.task.memorize || t.task.options.length < 2); i++) {
    if (t.stage === 'break') t.proceed()
    else {
      if (t.phase === 'memorize') t.memorized()
      if (t.task?.select === 'multi') { t.answer(t.task.correctIds[0]!); t.submit(); t.answer(t.task.correctIds[0]!); t.submit() }
      if (!t.done) t.answer(t.task!.correctIds[0]!)
      t.proceed()
    }
  }
}

describe('Trainingsablauf', () => {
  beforeEach(() => { vi.useRealTimers() })

  it('beginnt mit Begrüßung, dann Aufwärmaufgabe', async () => {
    setActivePinia(createPinia())
    await db.delete(); await db.open()
    await useSettingsStore().load(); await useContentStore().load()
    const id = await useProfileStore().create('Maria', 'sun')
    const t = useTrainingStore()
    await t.start(id, 'alone')
    expect(t.stage).toBe('greeting')
    t.begin()
    expect(t.stage).toBe('task')
    expect(t.warmup).toBe(true)
    expect(t.blockSize).toBe(3)
  })

  it('richtig im 1. Versuch: Lob, Versuch gespeichert, Weiter', async () => {
    const { training: t } = await setup()
    toSingleTask(t)
    t.answer(t.task!.correctIds[0]!)
    expect(t.phase).toBe('correct')
    await vi.waitFor(async () => expect(await db.attempts.count()).toBeGreaterThan(0))
    const last = await db.attempts.orderBy('id').last()
    expect(last).toMatchObject({ correct: true, tries: 1, hint: false, assisted: false })
  })

  it('1. Fehler: ausgegraut + Hinweis, andere bleiben wählbar; 2. Fehler: Lösung', async () => {
    const { training: t } = await setup(6)
    // Aufgabe mit mindestens 3 Antworten suchen, damit zwei Fehler möglich sind
    for (let i = 0; i < 200 && !(t.task?.select === 'single' && !t.task.memorize && t.task.options.length >= 3); i++) {
      if (t.stage === 'break') { t.proceed(); continue }
      if (t.phase === 'memorize') t.memorized()
      if (t.task!.select === 'multi') { t.answer(t.task!.correctIds[0]!); t.submit(); t.submit() }
      if (!t.done && t.task!.options.length < 2) t.answer(t.task!.correctIds[0]!)
      if (!t.done) { t.answer(wrongId(t)); if (!t.done) t.answer(wrongId(t)) }
      t.proceed()
    }
    const first = wrongId(t)
    t.answer(first)
    expect(t.phase).toBe('answer')
    expect(t.eliminated).toEqual([first])
    expect(t.hintVisible).toBe(true)
    t.answer(first) // ausgegraut: wird ignoriert
    expect(t.tries).toBe(1)
    t.answer(t.task!.options.find((o) => !t.task!.correctIds.includes(o.id) && o.id !== first)!.id)
    expect(t.phase).toBe('solution')
    expect(t.hintVisible).toBe(false)
  })

  it('richtig im 2. Versuch zählt als tries 2', async () => {
    const { training: t } = await setup()
    toSingleTask(t)
    t.answer(wrongId(t))
    t.answer(t.task!.correctIds[0]!)
    expect(t.phase).toBe('correct')
    await vi.waitFor(async () => expect((await db.attempts.orderBy('id').last())?.tries).toBe(2))
  })

  it('nach 3 sauberen Treffern derselben Übung bleibt das Niveau gleich', async () => {
    const { training: t, profile } = await setup()
    const ex = t.task!.exercise
    const before = profile.levelOf(ex)
    for (let i = 0; i < 3; i++) {
      if (t.phase === 'memorize') t.memorized()
      if (t.task!.select === 'multi') { t.task!.correctIds.forEach((id) => t.answer(id)); t.submit() }
      else t.answer(t.task!.correctIds[0]!)
      t.proceed()
    }
    expect(profile.levelOf(ex)).toBe(before)
  })

  it('Pause hält die Zeit an; Ende nach Einheitslänge mit Abschlussbildschirm', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { training: t } = await setup()
    t.pause()
    expect(t.stage).toBe('paused')
    vi.advanceTimersByTime(60 * 60_000) // eine Stunde Pause zählt nicht
    t.resume()
    expect(t.elapsedMs()).toBeLessThan(1000)

    for (let i = 0; i < 500 && t.stage !== 'end'; i++) {
      if (t.stage === 'break') { t.proceed(); continue }
      vi.advanceTimersByTime(30_000)
      if (t.phase === 'memorize') t.memorized()
      if (t.task!.select === 'multi') { t.task!.correctIds.forEach((id) => t.answer(id)); t.submit() }
      else t.answer(t.task!.correctIds[0]!)
      t.proceed()
    }
    expect(t.stage).toBe('end')
    expect(t.minutesTrained).toBeGreaterThanOrEqual(15)
    expect(t.minutesTrained).toBeLessThan(18)
    vi.useRealTimers()
  })

  it('„Für heute aufhören“ beendet sofort und speichert das Ende', async () => {
    const { training: t } = await setup()
    t.pause()
    t.finish()
    expect(t.stage).toBe('end')
    await vi.waitFor(async () => expect((await db.sessions.toArray())[0]?.endedAt).toBeTypeOf('number'))
  })
})
