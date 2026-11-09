import { describe, expect, it } from 'vitest'
import type { Level } from '@/db/database'
import { effectiveLevel, initialSkill, nextLevel, type Result } from './adaptive'

const R = {
  clean: { correct: true, tries: 1, hint: false },
  withHint: { correct: true, tries: 1, hint: true },
  second: { correct: true, tries: 2, hint: false },
  wrong: { correct: false, tries: 2, hint: false },
} satisfies Record<string, Result>

/** Spielt eine feste Antwortfolge durch und liefert die Niveaus nach jeder Antwort. */
function play(start: Level, seq: (keyof typeof R)[], locked = false): Level[] {
  let s = { level: start, streak: 0, locked }
  return seq.map((k) => { s = { ...s, ...nextLevel(s, R[k]) }; return s.level })
}

describe('nextLevel', () => {
  it('steigt nach 3 sauberen Treffern in Folge um 1', () => {
    expect(play(2, ['clean', 'clean', 'clean'])).toEqual([2, 2, 3])
  })

  it('sinkt nach 2 Fehlern in Folge um 1', () => {
    expect(play(5, ['wrong', 'wrong'])).toEqual([5, 4])
  })

  it('Treffer mit Hinweis oder im 2. Versuch unterbricht die Serie, ist aber kein Fehler', () => {
    expect(play(4, ['clean', 'clean', 'withHint', 'clean', 'clean'])).toEqual([4, 4, 4, 4, 4])
    expect(play(4, ['wrong', 'second', 'wrong'])).toEqual([4, 4, 4])
  })

  it('ein Fehler setzt eine Trefferserie zurück und umgekehrt', () => {
    expect(play(4, ['clean', 'clean', 'wrong', 'clean', 'clean', 'clean'])).toEqual([4, 4, 4, 4, 4, 5])
    expect(play(4, ['wrong', 'clean', 'wrong', 'wrong'])).toEqual([4, 4, 4, 3])
  })

  it('bleibt zwischen 1 und 10', () => {
    expect(play(10, ['clean', 'clean', 'clean'])).toEqual([10, 10, 10])
    expect(play(1, ['wrong', 'wrong', 'wrong', 'wrong'])).toEqual([1, 1, 1, 1])
  })

  it('setzt die Serie nach einem Stufenwechsel zurück', () => {
    expect(play(2, Array(6).fill('clean'))).toEqual([2, 2, 3, 3, 3, 4])
    expect(play(6, Array(4).fill('wrong'))).toEqual([6, 5, 5, 4])
  })

  it('festgehaltenes Niveau ändert sich nicht', () => {
    expect(play(3, ['clean', 'clean', 'clean', 'wrong', 'wrong'], true)).toEqual([3, 3, 3, 3, 3])
  })

  it('pendelt bei etwa 80 % sauberen Treffern nicht nach unten', () => {
    // Muster: 4 richtig, 1 falsch (= 80 %)
    const seq = Array.from({ length: 40 }, (_, i): keyof typeof R => (i % 5 === 4 ? 'wrong' : 'clean'))
    const levels = play(3, seq)
    expect(levels.at(-1)).toBeGreaterThan(3)
  })
})

describe('Start und Pause', () => {
  const DAY = 86_400_000

  it('neue Profile starten auf Niveau 2', () => {
    expect(initialSkill(1, 'math', 0)).toMatchObject({ level: 2, streak: 0 })
  })

  it('nach mehr als 14 Tagen ohne Training ein Niveau tiefer', () => {
    expect(effectiveLevel({ level: 5, lastAt: 0 }, 14 * DAY)).toBe(5)
    expect(effectiveLevel({ level: 5, lastAt: 0 }, 15 * DAY)).toBe(4)
    expect(effectiveLevel({ level: 1, lastAt: 0 }, 30 * DAY)).toBe(1)
    expect(effectiveLevel({ level: 5, lastAt: 0, locked: true }, 30 * DAY)).toBe(5)
  })
})
