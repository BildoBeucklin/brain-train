import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrast } from '@/design/color'
import { STROOP_COLORS } from '@/exercises/stroop/colors'

const css = readFileSync('src/styles/tokens.css', 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]))
}

const themes = {
  hell: block(':root {'),
  dunkel: { ...block(':root {'), ...block(":root[data-theme='dark']") },
  kontrast: { ...block(':root {'), ...block(":root[data-theme='contrast']") },
}

const TEXT_PAIRS: [string, string][] = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-text', 'color-accent-soft'],
  ['color-text', 'color-success-bg'],
  ['color-text-muted', 'color-bg'],
  ['color-text-muted', 'color-surface'],
  ['color-neutral-text', 'color-neutral-bg'],
  ['color-on-accent', 'color-accent'],
  ['color-accent-text', 'color-bg'],
  ['color-accent-text', 'color-surface'],
  ['color-accent-text', 'color-accent-soft'],
]

const UI_PAIRS: [string, string][] = [
  ['color-control-border', 'color-surface'],
  ['color-control-border', 'color-bg'],
  ['color-success-border', 'color-surface'],
  ['color-success-border', 'color-success-bg'],
  ['color-accent', 'color-bg'],
  ['color-focus-ring', 'color-focus'],
  ...['flower', 'sun', 'bird', 'cat', 'anchor', 'coffee'].flatMap((p): [string, string][] => [
    [`profile-${p}`, 'color-surface'], [`profile-${p}`, 'color-bg']]),
  ['series-alone', 'color-surface'],
  ['series-assisted', 'color-surface'],
]

describe.each(Object.entries(themes))('Theme %s', (_, t) => {
  it.each(TEXT_PAIRS)('Text %s auf %s ≥ 7:1', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(7)
  })

  it.each(UI_PAIRS)('Rahmen/Icon %s auf %s ≥ 3:1', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3)
  })
})

describe('Farben der Farbübung', () => {
  it.each(STROOP_COLORS.map((c) => [c.name, c] as const))('%s: CSS und Code stimmen überein, große Schrift ≥ 4,5:1', (_, c) => {
    expect(themes.hell[c.cssVar.slice(2)]).toBe(c.light)
    expect(themes.dunkel[c.cssVar.slice(2)]).toBe(c.dark)
    expect(contrast(c.light, themes.hell['color-surface']!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.dark, themes.dunkel['color-surface']!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(themes.kontrast[c.cssVar.slice(2)]!, themes.kontrast['color-surface']!)).toBeGreaterThanOrEqual(7)
  })
})
