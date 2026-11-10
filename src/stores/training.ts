import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { db, type ExerciseId } from '@/db/database'
import { NoContentError } from '@/exercises/build'
import { clampLevel } from '@/exercises/levels'
import { Planner } from '@/exercises/planner'
import { EXERCISE_IDS, registry } from '@/exercises/registry'
import { isCorrect, type Task } from '@/exercises/types'
import { useContentStore } from './content'
import { useProfileStore } from './profile'
import { useSettingsStore } from './settings'

/** Wo die Einheit gerade steht. */
export type Stage = 'idle' | 'greeting' | 'task' | 'break' | 'paused' | 'end'
/** Phase einer Aufgabe. */
export type Phase = 'memorize' | 'answer' | 'correct' | 'solution'

export const useTrainingStore = defineStore('training', () => {
  const profile = useProfileStore()
  const content = useContentStore()
  const settings = useSettingsStore()

  const stage = ref<Stage>('idle')
  const task = shallowRef<Task | null>(null)
  const phase = ref<Phase>('answer')
  const tries = ref(0)
  const eliminated = ref<string[]>([]) // ausgegraute falsche Antworten
  const selected = ref<string[]>([]) // Mehrfachauswahl (Merken)
  const hintVisible = ref(false)
  const usedHint = ref(false) // Hinweis von der Begleitperson (Meilenstein 4)
  const blockIndex = ref(0)
  const blockSize = ref(5)
  const warmup = ref(false)
  const sessionId = ref<number | null>(null)

  let planner: Planner | null = null
  let activeMs = 0 // Trainingszeit ohne Pausen
  let activeSince: number | null = null
  let taskStartedAt = 0
  let stageBeforePause: Stage = 'task'

  const elapsedMs = () => activeMs + (activeSince != null ? Date.now() - activeSince : 0)
  const minutesTrained = ref(0)

  function runClock(on: boolean) {
    if (on && activeSince == null) activeSince = Date.now()
    if (!on && activeSince != null) { activeMs += Date.now() - activeSince; activeSince = null }
  }

  const isMulti = computed(() => task.value?.select === 'multi')
  const done = computed(() => phase.value === 'correct' || phase.value === 'solution')

  async function start(profileId: number, mode: 'alone' | 'assisted'): Promise<void> {
    await profile.select(profileId)
    await settings.set('mode', mode)
    const now = Date.now()
    sessionId.value = await db.sessions.add({ profileId, mode, startedAt: now })
    planner = new Planner({
      exercises: EXERCISE_IDS,
      favorite: await profile.favorite(),
      sessionMs: settings.values.sessionMinutes * 60_000,
      random: Math.random,
    })
    activeMs = 0; activeSince = null
    task.value = null
    stage.value = 'greeting'
  }

  function begin(): void {
    runClock(true)
    nextStep()
  }

  /** Holt den nächsten Schritt aus dem Planer. Übungen ohne Inhalte werden übersprungen. */
  function nextStep(): void {
    if (!planner) return
    for (let guard = 0; guard < 50; guard++) {
      const step = planner.next(elapsedMs())
      if (step.type === 'end') return void finish()
      if (step.type === 'break') { runClock(false); stage.value = 'break'; return }
      try {
        showTask(step.exercise, clampLevel(profile.levelOf(step.exercise) + step.levelOffset))
        blockIndex.value = step.index
        blockSize.value = step.of
        warmup.value = step.warmup
        return
      } catch (e) {
        if (!(e instanceof NoContentError)) throw e
      }
    }
    finish()
  }

  function showTask(exercise: ExerciseId, level: ReturnType<typeof clampLevel>): void {
    const t = registry[exercise].generate({
      level, random: Math.random, draw: content.draw, pool: content.pool,
      assisted: assisted.value,
    })
    task.value = t
    phase.value = t.memorize ? 'memorize' : 'answer'
    tries.value = 0
    eliminated.value = []
    selected.value = []
    hintVisible.value = false
    usedHint.value = false
    stage.value = 'task'
    taskStartedAt = Date.now()
  }

  /** Merken: „Ich habe sie mir gemerkt“. */
  function memorized(): void {
    if (phase.value === 'memorize') phase.value = 'answer'
  }

  /** Eine Antwort antippen (Einzelauswahl) bzw. an-/abwählen (Mehrfachauswahl). */
  function answer(optionId: string): void {
    const t = task.value
    if (!t || phase.value !== 'answer' || eliminated.value.includes(optionId)) return
    if (t.select === 'multi') {
      selected.value = selected.value.includes(optionId)
        ? selected.value.filter((id) => id !== optionId)
        : [...selected.value, optionId]
      return
    }
    evaluate([optionId])
  }

  const assisted = computed(() => settings.values.mode === 'assisted')

  /** Begleitperson: „Hinweis geben“ – graut eine falsche Antwort aus und zeigt den Hinweis. Zählt als Hinweis. */
  function hint(): void {
    const t = task.value
    if (!t || phase.value !== 'answer' || t.open) return
    const candidates = t.options.filter((o) =>
      !t.correctIds.includes(o.id) && !eliminated.value.includes(o.id) && !selected.value.includes(o.id))
    const remaining = t.options.length - eliminated.value.length
    // Bei Einzelauswahl mindestens zwei Antworten übrig lassen
    if (candidates.length && (t.select === 'multi' || remaining > 2)) {
      eliminated.value = [...eliminated.value, candidates[Math.floor(Math.random() * candidates.length)]!.id]
    }
    usedHint.value = true
    hintVisible.value = true
  }

  /** Begleitperson wertet eine mündliche Antwort: „Mündlich richtig“ bzw. „Nicht gewusst“. */
  function judge(correct: boolean): void {
    if (!task.value || stage.value !== 'task' || done.value) return
    if (phase.value === 'memorize') phase.value = 'answer'
    if (!correct) tries.value = 2
    else tries.value = Math.max(tries.value, 0) + 1
    finishTask(correct)
  }

  /** Begleitperson: nächste Aufgabe ohne Wertung. */
  function skip(): void {
    if (stage.value === 'task') nextStep()
  }

  /** Begleitperson: Niveau der aktuellen Übung ändern; die Aufgabe wird auf dem neuen Niveau neu gestellt. */
  async function changeLevel(delta: number): Promise<void> {
    const t = task.value
    if (!t || stage.value !== 'task') return
    // vom angezeigten Niveau aus (beim Aufwärmen liegt es eins unter dem gespeicherten)
    const level = clampLevel(t.level + delta)
    if (level === t.level) return
    if (sessionId.value != null) await profile.setLevel(t.exercise, level)
    try { showTask(t.exercise, level) } catch (e) { if (!(e instanceof NoContentError)) throw e }
  }

  async function setLocked(locked: boolean): Promise<void> {
    const t = task.value
    if (!t || sessionId.value == null) return
    await profile.setLevel(t.exercise, profile.levelOf(t.exercise), locked)
  }

  async function setAssisted(on: boolean): Promise<void> {
    await settings.set('mode', on ? 'assisted' : 'alone')
  }

  /** Mehrfachauswahl: „Fertig“. */
  function submit(): void {
    if (task.value?.select === 'multi' && phase.value === 'answer' && selected.value.length) evaluate(selected.value)
  }

  function evaluate(selection: string[]): void {
    const t = task.value!
    tries.value++
    if (isCorrect(t, selection)) return void finishTask(true)
    if (tries.value === 1) {
      // 1. Fehler: falsch gewählte ausgrauen, Hinweis zeigen
      const wrong = selection.filter((id) => !t.correctIds.includes(id))
      eliminated.value = [...eliminated.value, ...wrong]
      selected.value = selected.value.filter((id) => !wrong.includes(id))
      hintVisible.value = true
      return
    }
    finishTask(false) // 2. Fehler: Lösung zeigen und erklären
  }

  function finishTask(correct: boolean): void {
    const t = task.value!
    phase.value = correct ? 'correct' : 'solution'
    hintVisible.value = false
    const result = { correct, tries: (tries.value >= 2 ? 2 : 1) as 1 | 2, hint: usedHint.value }
    const now = Date.now()
    if (sessionId.value == null || profile.currentId == null) return // Vorschau: nichts speichern
    void profile.applyResult(t.exercise, result, now)
    {
      void db.attempts.add({
        sessionId: sessionId.value, profileId: profile.currentId, exercise: t.exercise, level: t.level,
        ...result, assisted: assisted.value, ms: now - taskStartedAt, at: now,
      })
    }
  }

  /** „Weiter“ nach Lob oder Lösung bzw. auf dem Zwischenbildschirm. */
  function proceed(): void {
    if (stage.value === 'break') { runClock(true); nextStep(); return }
    if (stage.value === 'task' && done.value) nextStep()
  }

  function pause(): void {
    if (stage.value === 'paused' || stage.value === 'end' || stage.value === 'idle') return
    stageBeforePause = stage.value === 'break' ? 'break' : stage.value
    runClock(false)
    stage.value = 'paused'
  }

  function resume(): void {
    if (stage.value !== 'paused') return
    stage.value = stageBeforePause
    if (stage.value === 'task') runClock(true)
  }

  function finish(): void {
    runClock(false)
    planner?.finish()
    minutesTrained.value = Math.max(1, Math.round(elapsedMs() / 60_000))
    if (sessionId.value != null) void db.sessions.update(sessionId.value, { endedAt: Date.now(), activeMs: elapsedMs() })
    task.value = null
    stage.value = 'end'
  }

  /** Vorschau einer Aufgabe ohne Einheit (Entwicklung, später Inhalts-Editor). */
  function preview(exercise: ExerciseId, level: ReturnType<typeof clampLevel>): void {
    sessionId.value = null
    blockIndex.value = 0
    blockSize.value = 5
    showTask(exercise, level)
  }

  function reset(): void {
    stage.value = 'idle'
    task.value = null
    sessionId.value = null
    planner = null
  }

  return {
    stage, task, phase, tries, eliminated, selected, hintVisible, usedHint, blockIndex, blockSize, warmup,
    sessionId, minutesTrained, isMulti, done, assisted,
    start, begin, preview, memorized, hint, judge, skip, changeLevel, setLocked, setAssisted, answer, submit, proceed, pause, resume, finish, reset, elapsedMs,
  }
})
