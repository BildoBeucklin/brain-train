import { describe, expect, it } from 'vitest'
import type { ExerciseId, Level } from '@/db/database'
import { buildSeedItems } from '@/db/seed'
import { createContentSource } from './content'
import { band, LEVELS, optionCount } from './levels'
import { seededRandom } from './random'
import { EXERCISE_IDS, registry } from './registry'
import { isCorrect, type Task } from './types'
import { SILHOUETTES } from './mirror/silhouettes'
import { colorsConfusable, colorsDistinct, STROOP_COLORS } from './stroop/colors'
import type { StroopData } from './stroop/generator'
import type { MirrorData } from './mirror/generator'
import type { ShoppingData } from './shopping/generator'
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
  if (ex === 'shopping') return ({ low: 18, mid: 45, high: 4 } as const)[band(level)] // Laden: Waren × Anzahl
  if (ex === 'mirror') return ({ low: 9, mid: 16, high: 16 } as const)[band(level)]
  if (ex === 'stroop' || (ex === 'upsideDown' && band(level) === 'high')) return 1 // Farb-Wort-Gitter: nur „Fertig gelesen“
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
      else expect(t.correctIds.length, ctx).toBeGreaterThanOrEqual(ex === 'mirror' || ex === 'shopping' ? 1 : 3)
      expect(isCorrect(t, t.correctIds), ctx).toBe(true)
      expect(t.open, ctx).toBeUndefined() // offen nur betreut
    }
  })

  it('ist deterministisch', () => {
    expect(generate(ex, 5, 3)).toEqual(generate(ex, 5, 3))
  })

  it.skipIf(ex === 'stroop' || ex === 'upsideDown')('die richtige Antwort steht nicht immer an derselben Stelle', () => {
    const positions = new Set(Array.from({ length: 40 }, (_, s) => {
      const t = generate(ex, 9, s)
      return t.options.findIndex((o) => o.id === t.correctIds[0])
    }))
    expect(positions.size).toBeGreaterThan(1)
  })
})

describe('Farben lesen', () => {
  const name = (id: string) => STROOP_COLORS.find((c) => c.id === id)!

  it('Gitter wächst mit dem Niveau, eine Antwort „Fertig gelesen“', () => {
    for (const [level, size] of [[2, 9], [5, 16], [9, 25]] as [Level, number][]) {
      const t = generate('stroop', level, 1) as Task<StroopData>
      expect(t.data.cells).toHaveLength(size)
      expect(t.options).toHaveLength(1)
      expect(t.correctIds).toEqual([t.options[0]!.id])
    }
  })

  it('Rot, Gelb, Blau; ab Niveau 8 mehr Farben', () => {
    for (const [level, n] of [[1, 3], [5, 3], [7, 3], [8, 4], [9, 5], [10, 6]] as [Level, number][]) {
      for (let s = 0; s < 10; s++) {
        const t = generate('stroop', level, s) as Task<StroopData>
        const palette = new Set([...t.data.cells.map((c) => c.ink), ...t.data.cells.map((c) => STROOP_COLORS.find((x) => x.name.toLowerCase() === c.word)!.id)])
        expect(palette.size).toBe(n)
        for (const id of palette) expect(['red', 'yellow', 'blue', 'green', 'purple', 'orange'].slice(0, n)).toContain(id)
      }
    }
  })

  it('ab mittel: Wort und Schriftfarbe passen nie', () => {
    for (const level of [5, 9] as Level[]) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('stroop', level, s) as Task<StroopData>
        const inks = [...new Set(t.data.cells.map((c) => c.ink))].map(name)
        for (const c of t.data.cells) expect(c.word).not.toBe(name(c.ink).name.toLowerCase())
        for (const a of inks) for (const b of inks) if (a !== b) expect(colorsDistinct(a, b)).toBe(true)
      }
    }
  })

  it('Rot und Grün sind laut Simulation verwechselbar, Rot und Blau nicht', () => {
    expect(colorsConfusable(name('red'), name('green'))).toBe(true)
    expect(colorsConfusable(name('red'), name('blue'))).toBe(false)
  })
})

describe('Spiegelbilder', () => {
  it('rechts ist das gespiegelte Raster; gesucht sind genau die nicht gespiegelten Bilder', () => {
    for (const level of [2, 5, 9] as Level[]) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('mirror', level, s) as Task<MirrorData>
        const { cols, left, right } = t.data
        right.forEach((p, i) => {
          if (band(level) !== 'high') expect(p.icon).toBe(left[Math.floor(i / cols) * cols + (cols - 1 - (i % cols))])
          expect(t.correctIds.includes(`p${i}`)).toBe(p.plain)
        })
        expect(right.map((p) => p.icon).sort()).toEqual([...left].sort())
        expect(t.singleTry).toBe(true)
        expect(new Set(left).size).toBe(left.length)
        for (const icon of left) expect(SILHOUETTES[icon], icon).toContain('<svg')
      }
    }
  })
})

describe('Einkaufen', () => {
  const cents = (s: string) => Math.round(Number(s.replace(' €', '').replace('.', '').replace(',', '.')) * 100)

  it('Laden: Zettel = richtige Auswahl (Ware und Anzahl), alle Waren im Regal', () => {
    for (const level of [2, 3, 5, 7] as Level[]) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('shopping', level, s) as Task<ShoppingData>
        expect(t.custom).toBe(true)
        expect([...t.correctIds].sort()).toEqual(t.data.list.map((l) => `${l.key}:${l.count}`).sort())
        for (const l of t.data.list) {
          expect(t.data.shelf).toContain(l.key)
          expect(l.count).toBeLessThanOrEqual(t.data.maxCount!)
        }
      }
    }
  })

  it('rechnen: Gesamtpreis und Rückgeld stimmen', () => {
    for (const level of [8, 9, 10] as Level[]) {
      for (let s = 0; s < SEEDS; s++) {
        const t = generate('shopping', level, s) as Task<ShoppingData>
        const total = t.data.list.reduce((sum, l) => sum + l.cents! * l.count, 0)
        const answer = cents(t.options.find((o) => o.id === t.correctIds[0])!.label)
        expect(answer).toBe(t.data.paidCents ? t.data.paidCents - total : total)
      }
    }
  })

  it('jedes Warenbild ist vorhanden', async () => {
    const { PRODUCTS } = await import('./shopping/products')
    const { productImage } = await import('./shopping/images')
    for (const p of PRODUCTS) expect(productImage(p.key), p.file).toBeTruthy()
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
    const lines = (n: Level) => (generate('upsideDown', n, 1) as Task<{ text: string; lines: string[] }>).data.lines.length
    expect(lines(10)).toBeGreaterThan(lines(8))
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
