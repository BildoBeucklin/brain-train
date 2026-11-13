import { describe, expect, it } from 'vitest'
import { Planner, type PlanStep } from './planner'
import { seededRandom } from './random'
import { EXERCISE_IDS } from './registry'

const MIN = 60_000

/** Simuliert eine Einheit; jede Aufgabe dauert msPerTask. */
function run(sessionMs: number, msPerTask: number, seed = 1): PlanStep[] {
  const p = new Planner({ exercises: EXERCISE_IDS, favorite: 'proverbs', sessionMs, random: seededRandom(seed) })
  const steps: PlanStep[] = []
  let elapsed = 0
  for (let i = 0; i < 1000; i++) {
    const s = p.next(elapsed)
    steps.push(s)
    if (s.type === 'end') break
    if (s.type === 'task') elapsed += msPerTask
  }
  return steps
}

describe('Planner', () => {
  it('beginnt mit 3 Aufwärmaufgaben der Lieblingsübung, ein Niveau tiefer', () => {
    const steps = run(15 * MIN, 30_000).slice(0, 3)
    expect(steps).toEqual([0, 1, 2].map((index) =>
      ({ type: 'task', exercise: 'proverbs', levelOffset: -1, warmup: true, index, of: 3 })))
  })

  it('danach Blöcke von 5 Aufgaben derselben Übung mit Zwischenbildschirm', () => {
    const steps = run(15 * MIN, 30_000).slice(3)
    const blocks: PlanStep[][] = []
    let cur: PlanStep[] = []
    for (const s of steps) {
      if (s.type === 'task') cur.push(s)
      else { blocks.push(cur); cur = [] }
    }
    for (const b of blocks) {
      expect(b).toHaveLength(5)
      expect(new Set(b.map((s) => s.type === 'task' && s.exercise)).size).toBe(1)
      expect(b.map((s) => s.type === 'task' && s.index)).toEqual([0, 1, 2, 3, 4])
    }
  })

  it('wechselt die Übung und wiederholt sie nicht direkt (auch nicht nach dem Aufwärmen)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const ex = run(60 * MIN, 30_000, seed).filter((s) => s.type === 'task').map((s) => s.type === 'task' && s.exercise)
      const firstOfBlocks = [ex[0], ...ex.slice(3).filter((_, i) => i % 5 === 0)]
      for (let i = 1; i < firstOfBlocks.length; i++) expect(firstOfBlocks[i]).not.toBe(firstOfBlocks[i - 1])
    }
  })

  it('kommt bei 15 Minuten in alle Übungen, wenn genug Zeit ist', () => {
    const ex = run(30 * MIN, 30_000).filter((s) => s.type === 'task' && !s.warmup).map((s) => s.type === 'task' && s.exercise)
    expect(new Set(ex).size).toBe(EXERCISE_IDS.length)
  })

  it('beendet nach Ablauf der Zeit erst den laufenden Block', () => {
    const steps = run(15 * MIN, 40_000)
    expect(steps.at(-1)).toEqual({ type: 'end' })
    const tasks = steps.filter((s) => s.type === 'task').length
    expect((tasks - 3) % 5).toBe(0)
    expect(tasks * 40_000).toBeGreaterThanOrEqual(15 * MIN)
    expect((tasks - 5) * 40_000).toBeLessThan(15 * MIN)
  })

  it('finish() beendet sofort', () => {
    const p = new Planner({ exercises: EXERCISE_IDS, sessionMs: 15 * MIN, random: seededRandom(1) })
    p.next(0)
    p.finish()
    expect(p.next(0)).toEqual({ type: 'end' })
  })
})
