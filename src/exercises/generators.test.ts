import { describe, expect, it } from 'vitest'
import type { ExerciseId, Level } from '@/db/database'
import { buildSeedItems } from '@/db/seed'
import { createContentSource } from './content'
import { band, LEVELS, optionCount } from './levels'
import { seededRandom } from './random'
import { EXERCISE_IDS, registry } from './registry'
import { isCorrect, type Task } from './types'
import { colorsConfusable, STROOP_COLORS } from './stroop/colors'
import type { StroopData } from './stroop/generator'
import type { MathData } from './math/generator'

const SEEDS = 60
const items = buildSeedItems().map((i, id) => ({ ...i, id: id + 1 }))

function generate(exercise: ExerciseId, level: Level, seed: number, assisted = false): Task {
  const random = seededRandom(seed * 101 + level)
  const src = createContentSource(items, random)
  return registry[exercise].generate({ level, random, draw: src.draw, pool: src.pool, assisted })
}

function expectedOptions(ex: ExerciseId, level: Level): number {
  if (ex === 'memory') return ({ low: 2, mid: 6, high: 9 } as const)[band(level)]
  if (ex === 'oddOneOut') return ({ low: 3, mid: 4, high: 5 } as const)[band(level)]
  return optionCount(level)
}

describe.each(EXERCISE_IDS)('Generator %s', (ex) => {
  it.each(LEVELS)('Niveau %i: gültige Aufgaben mit festem Zufall', (level) => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const t = generate(ex, level, seed)
      const ctx = `${ex} L${level} seed ${seed}`
      expect(t.exercise, ctx).toBe(ex)
      expect(t.level, ctx).toBe(level)
      expect(t.prompt.trim(), ctx).not.toBe('')
      expect(t.hint.trim(), ctx).not.toBe('')
      expect(t.explanation?.trim(), ctx).toBeTruthy()
      expect(t.options, ctx).toHaveLength(expectedOptions(ex, level))
      expect(new Set(t.options.map((o) => o.id)).size, ctx).toBe(t.options.length)
      expect(new Set(t.options.map((o) => o.label.toLowerCase())).size, ctx).toBe(t.options.length)
      expect(t.correctIds.every((id) => t.options.some((o) => o.id === id)), ctx).toBe(true)
      if (t.select === 'single') expect(t.correctIds, ctx).toHaveLength(1)
      else expect(t.correctIds.length, ctx).toBeGreaterThanOrEqual(3)
      expect(isCorrect(t, t.correctIds), ctx).toBe(true)
      expect(t.open, ctx).toBeUndefined() // offen nur betreut
    }
  })

  it('ist deterministisch', () => {
    expect(generate(ex, 5, 3)).toEqual(generate(ex, 5, 3))
  })

  it('die richtige Antwort steht nicht immer an derselben Stelle', () => {
    const positions = new Set(Array.from({ length: 40 }, (_, s) => {
      const t = generate(ex, 9, s)
      return t.options.findIndex((o) => o.id === t.correctIds[0])
    }))
    expect(positions.size).toBeGreaterThan(1)
  })
})

describe('Farben lesen', () => {
  const name = (id: string) => STROOP_COLORS.find((c) => c.id === id)!

  it('leicht: Wort und Farbe passen', () => {
    for (let s = 0; s < SEEDS; s++) {
      const t = generate('stroop', 2, s) as Task<StroopData>
      expect(t.data.word).toBe(name(t.data.ink).name)
    }
  })

  it('mittel: Wort in fremder Farbe, gesucht ist das Wort, Schriftfarbe ist Ablenker', () => {
    for (let s = 0; s < SEEDS; s++) {
      const t = generate('stroop', 5, s) as Task<StroopData>
      expect(t.data.word).not.toBe(name(t.data.ink).name)
      expect(t.options.find((o) => o.id === t.correctIds[0])!.label).toBe(t.data.word)
      expect(t.options.map((o) => o.label)).toContain(name(t.data.ink).name)
    }
  })

  it('schwer: Schriftfarbe ist mit keiner angebotenen Farbe verwechselbar (Rot-Grün-Schwäche)', () => {
    for (const level of [8, 9, 10] as Level[]) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('stroop', level, s) as Task<StroopData>
        const ink = name(t.data.ink)
        expect(t.options.find((o) => o.id === t.correctIds[0])!.label).toBe(ink.name)
        for (const o of t.options) {
          expect(o.swatch).toBeDefined()
          const c = STROOP_COLORS.find((x) => x.name === o.label)!
          if (c.id !== ink.id) expect(colorsConfusable(ink, c), `${ink.name}/${c.name}`).toBe(false)
        }
      }
    }
  })

  it('Rot und Grün sind laut Simulation verwechselbar, Rot und Blau nicht', () => {
    expect(colorsConfusable(name('red'), name('green'))).toBe(true)
    expect(colorsConfusable(name('red'), name('blue'))).toBe(false)
  })
})

describe('Rechnen', () => {
  const parse = (s: string) => Math.round(Number(s.replace(' €', '').replace('.', '').replace(',', '.')) * 100)

  it('Lösung stimmt auf allen Niveaus', () => {
    for (const level of LEVELS) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('math', level, s) as Task<MathData>
        const answer = t.options.find((o) => o.id === t.correctIds[0])!.label
        const d = t.data
        if (d.kind === 'dots') {
          expect(Number(answer)).toBe(d.count)
          expect(d.count).toBeLessThanOrEqual(5)
        } else if (d.kind === 'term') {
          const [a, op, b] = d.text.split(' ')
          expect(Number(answer)).toBe(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b))
          expect(Number(answer)).toBeGreaterThanOrEqual(0)
        } else if (d.kind === 'shopping') {
          expect(parse(answer)).toBe(d.items.reduce((x, i) => x + i.cents, 0))
          expect(parse(answer)).toBeLessThanOrEqual(5000)
        } else {
          expect(parse(answer)).toBe(d.paidCents - d.items.reduce((x, i) => x + i.cents, 0))
          expect(parse(answer)).toBeGreaterThan(0)
        }
        for (const o of t.options) if (d.kind !== 'dots' && d.kind !== 'term') expect(parse(o.label)).toBeGreaterThan(0)
      }
    }
  })
})

describe('Inhaltsübungen', () => {
  it('Rückwärts lesen: angezeigtes Wort ist die Lösung rückwärts', () => {
    for (const level of LEVELS) {
      const t = generate('reverse', level, 1) as Task<{ shown: string }>
      expect([...t.data.shown].reverse().join('')).toBe(t.options.find((o) => o.id === t.correctIds[0])!.label)
    }
  })

  it('Auf dem Kopf: leicht in Großbuchstaben, schwer als Satz', () => {
    const low = generate('upsideDown', 2, 1) as Task<{ text: string }>
    expect(low.data.text).toBe(low.data.text.toUpperCase())
    const high = generate('upsideDown', 9, 1) as Task<{ text: string }>
    expect(high.data.text).toContain(' ')
  })

  it('Merken: leicht Ja/Nein, mittel 3–4 aus 6, schwer 5–7 aus 9', () => {
    for (let s = 0; s < SEEDS; s++) {
      const low = generate('memory', 2, s)
      expect(low.memorize!.items).toHaveLength(2)
      expect(low.options.map((o) => o.label)).toEqual(['Ja', 'Nein'])
      const mid = generate('memory', 5, s)
      expect(mid.select).toBe('multi')
      expect(mid.memorize!.items.length).toBeGreaterThanOrEqual(3)
      expect(mid.memorize!.items.length).toBeLessThanOrEqual(4)
      expect(mid.correctIds).toHaveLength(mid.memorize!.items.length)
      const high = generate('memory', 10, s)
      expect(high.memorize!.items.length).toBeGreaterThanOrEqual(5)
      expect(high.memorize!.items.length).toBeLessThanOrEqual(7)
    }
  })

  it('Sprichwörter: schwer wird die Bedeutung gefragt', () => {
    expect(generate('proverbs', 9, 1).prompt).toBe('Was bedeutet dieses Sprichwort?')
    expect(generate('proverbs', 5, 1).prompt).toBe('Wie geht das Sprichwort weiter?')
  })

  it('offene Aufgaben gibt es nur betreut und nur auf hohem Niveau', () => {
    const open = (ex: ExerciseId, level: Level, assisted: boolean) =>
      Array.from({ length: 50 }, (_, s) => generate(ex, level, s, assisted)).filter((t) => t.open).length
    expect(open('wordFinding', 9, true)).toBeGreaterThan(0)
    expect(open('proverbs', 9, true)).toBeGreaterThan(0)
    expect(open('wordFinding', 9, false)).toBe(0)
    expect(open('wordFinding', 5, true)).toBe(0)
  })
})

describe('isCorrect', () => {
  it('prüft Mehrfachauswahl unabhängig von der Reihenfolge', () => {
    const t = generate('memory', 5, 1)
    expect(isCorrect(t, [...t.correctIds].reverse())).toBe(true)
    expect(isCorrect(t, t.correctIds.slice(1))).toBe(false)
    const wrong = t.options.find((o) => !t.correctIds.includes(o.id))!.id
    expect(isCorrect(t, [...t.correctIds, wrong])).toBe(false)
  })
})
