import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/db/database'
import { EXERCISE_IDS } from '@/exercises/registry'
import { useContentStore } from '@/stores/content'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'

type T = ReturnType<typeof useTrainingStore>

async function setup(level = 6, mode: 'alone' | 'assisted' = 'assisted') {
  setActivePinia(createPinia())
  await db.delete(); await db.open()
  await useSettingsStore().load(); await useContentStore().load()
  const profile = useProfileStore()
  const id = await profile.create('Maria', 'flower')
  await db.skills.bulkPut(EXERCISE_IDS.map((exercise) => ({ profileId: id, exercise, level: level as 6, streak: 0, lastAt: Date.now() })))
  const t = useTrainingStore()
  await t.start(id, mode)
  t.begin()
  return { t, profile, id }
}

/** Zur nächsten Einzelauswahl-Aufgabe ohne Merken und ohne offene Frage springen. */
function toPlainSingle(t: T) {
  for (let i = 0; i < 200 && !(t.stage === 'task' && t.task?.select === 'single' && !t.task.memorize && !t.task.open && t.task.options.length >= 3); i++) {
    if (t.stage === 'break') t.proceed()
    else t.skip()
  }
}

const lastAttempt = async () => {
  await vi.waitFor(async () => expect(await db.attempts.count()).toBeGreaterThan(0))
  return (await db.attempts.orderBy('id').last())!
}

describe('Begleitleiste', () => {
  it('Hinweis geben: graut eine falsche Antwort aus, lässt mindestens zwei übrig, zählt als Hinweis', async () => {
    const { t } = await setup()
    toPlainSingle(t)
    const n = t.task!.options.length
    for (let i = 0; i < 5; i++) t.hint()
    expect(t.eliminated.length).toBe(n - 2)
    expect(t.eliminated.some((id) => t.task!.correctIds.includes(id))).toBe(false)
    expect(t.hintVisible).toBe(true)
    t.answer(t.task!.correctIds[0]!)
    expect(await lastAttempt()).toMatchObject({ correct: true, tries: 1, hint: true, assisted: true })
  })

  it('Treffer mit Hinweis zählt nicht für den Aufstieg', async () => {
    const { t, profile } = await setup()
    toPlainSingle(t)
    const ex = t.task!.exercise
    for (let i = 0; i < 3 && t.task?.exercise === ex; i++) {
      t.hint()
      t.answer(t.task!.correctIds[0]!)
      t.proceed()
    }
    expect(profile.levelOf(ex)).toBe(6)
  })

  it('Mündlich richtig / Nicht gewusst werten die Aufgabe', async () => {
    const { t } = await setup()
    toPlainSingle(t)
    t.judge(true)
    expect(t.phase).toBe('correct')
    expect(await lastAttempt()).toMatchObject({ correct: true, tries: 1, assisted: true })
    t.proceed()
    toPlainSingle(t)
    t.judge(false)
    expect(t.phase).toBe('solution')
    expect(await lastAttempt()).toMatchObject({ correct: false, tries: 2 })
  })

  it('Überspringen: nächste Aufgabe ohne Wertung', async () => {
    const { t } = await setup()
    toPlainSingle(t)
    const before = await db.attempts.count()
    const first = t.task
    t.skip()
    expect(t.task).not.toBe(first)
    expect(await db.attempts.count()).toBe(before)
  })

  it('Niveau ändern stellt die Aufgabe neu; Festhalten pausiert die Regel', async () => {
    const { t, profile } = await setup()
    toPlainSingle(t)
    const ex = t.task!.exercise
    const target = t.task!.level + 1
    await t.changeLevel(+1)
    expect(t.task!.level).toBe(target)
    expect(t.task!.exercise).toBe(ex)
    expect(profile.levelOf(ex)).toBe(target)
    expect((await db.skills.get([profile.currentId!, ex]))?.level).toBe(target)

    await t.setLocked(true)
    expect(profile.isLocked(ex)).toBe(true)
    for (let i = 0; i < 2; i++) { t.judge(false); t.proceed(); if (t.task?.exercise !== ex) break }
    expect(profile.levelOf(ex)).toBe(target)
  })

  it('Niveau bleibt zwischen 1 und 10', async () => {
    const { t } = await setup(10)
    toPlainSingle(t)
    await t.changeLevel(+1)
    expect(t.task!.level).toBe(10)
  })

  it('Umschalten während der Einheit wirkt auf die nächsten Antworten', async () => {
    const { t } = await setup(6, 'alone')
    toPlainSingle(t)
    t.answer(t.task!.correctIds[0]!)
    expect((await lastAttempt()).assisted).toBe(false)
    await t.setAssisted(true)
    t.proceed()
    toPlainSingle(t)
    t.answer(t.task!.correctIds[0]!)
    await vi.waitFor(async () => expect((await db.attempts.orderBy('id').last())?.assisted).toBe(true))
  })

  it('offene Aufgaben nur betreut; Wertung über die Begleitperson', async () => {
    const { t } = await setup(9)
    let found = false
    for (let i = 0; i < 400 && !found; i++) {
      if (t.stage === 'break') { t.proceed(); continue }
      if (t.task?.open) found = true
      else t.skip()
    }
    expect(found).toBe(true)
    t.answer(t.task!.correctIds[0]!) // Antippen ist bei offenen Aufgaben nicht vorgesehen, Wertung über judge
    t.judge(true)
    expect(t.phase).toBe('correct')
  })

  it('neue Profile haben noch keine Einheit (Start mit Begleitung)', async () => {
    const { profile, id } = await setup()
    expect(await profile.hasSessions(id)).toBe(true)
    const fresh = await profile.create('Hans', 'sun')
    expect(await profile.hasSessions(fresh)).toBe(false)
  })
})
