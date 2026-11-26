/** Deterministischer Zufall für Tests (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: () => number, list: readonly T[]): T {
  if (list.length === 0) throw new Error('pick: leere Liste')
  return list[Math.floor(random() * list.length)]!
}

export function shuffle<T>(random: () => number, list: readonly T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function sample<T>(random: () => number, list: readonly T[], n: number): T[] {
  return shuffle(random, list).slice(0, n)
}
