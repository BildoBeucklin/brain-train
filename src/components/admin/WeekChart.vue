<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeekMinutes } from '@/lib/history'

/**
 * Gestapeltes Balkendiagramm: geübte Minuten pro Woche, allein / mit Begleitung.
 * Farben aus validierten Tokens, 2 px Lücke zwischen den Segmenten, abgerundete Enden,
 * Legende + Summe über jedem Balken, Tooltip beim Zeigen, Tabellenansicht.
 */
const props = defineProps<{ weeks: WeekMinutes[] }>()

const W = 720, H = 260, PAD_L = 48, PAD_B = 36, PAD_T = 28
const plotW = W - PAD_L - 8
const plotH = H - PAD_T - PAD_B

const max = computed(() => {
  const m = Math.max(15, ...props.weeks.map((w) => w.alone + w.assisted))
  return Math.ceil(m / 15) * 15
})
const ticks = computed(() => [0, 1, 2, 3].map((i) => (max.value / 3) * i))
const y = (v: number) => PAD_T + plotH - (v / max.value) * plotH
const slot = computed(() => plotW / props.weeks.length)
const barW = computed(() => Math.min(56, slot.value * 0.55))

const hover = ref<number | null>(null)
const showTable = ref(false)

function segPath(x: number, y0: number, y1: number, w: number, roundTop: boolean): string {
  const h = y0 - y1
  if (h <= 0) return ''
  const r = roundTop ? Math.min(4, h) : 0
  return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`
}

const bars = computed(() => props.weeks.map((w, i) => {
  const x = PAD_L + slot.value * i + (slot.value - barW.value) / 2
  const base = y(0)
  const aloneTop = y(w.alone)
  const gap = w.alone > 0 && w.assisted > 0 ? 2 : 0
  const assistedTop = y(w.alone + w.assisted) - gap
  return {
    ...w, x, total: w.alone + w.assisted,
    alonePath: segPath(x, base, aloneTop, barW.value, w.assisted === 0),
    assistedPath: segPath(x, aloneTop - gap, assistedTop, barW.value, true),
    top: Math.min(aloneTop, assistedTop),
  }
}))
</script>

<template>
  <figure class="chart">
    <figcaption>
      <span class="title">Geübte Minuten pro Woche</span>
      <span class="legend">
        <span class="key"><i class="sw alone" />allein</span>
        <span class="key"><i class="sw assisted" />mit Begleitung</span>
      </span>
      <button type="button" class="toggle" @click="showTable = !showTable">{{ showTable ? 'Diagramm zeigen' : 'Als Tabelle zeigen' }}</button>
    </figcaption>

    <table v-if="showTable" class="table">
      <thead><tr><th scope="col">Woche</th><th scope="col">allein</th><th scope="col">mit Begleitung</th><th scope="col">zusammen</th></tr></thead>
      <tbody>
        <tr v-for="w in weeks" :key="w.weekStart"><th scope="row">{{ w.label }}</th><td>{{ w.alone }} min</td><td>{{ w.assisted }} min</td><td>{{ w.alone + w.assisted }} min</td></tr>
      </tbody>
    </table>

    <div v-else class="plot">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Balkendiagramm der geübten Minuten pro Woche; Tabellenansicht über den Knopf darüber">
        <g class="grid">
          <g v-for="t in ticks" :key="t">
            <line :x1="PAD_L" :x2="W - 8" :y1="y(t)" :y2="y(t)" />
            <text :x="PAD_L - 8" :y="y(t) + 5" text-anchor="end">{{ t }}</text>
          </g>
        </g>
        <g v-for="(b, i) in bars" :key="b.weekStart" @pointerenter="hover = i" @pointerleave="hover = null">
          <rect class="hit" :x="PAD_L + slot * i" :y="PAD_T" :width="slot" :height="plotH" />
          <path v-if="b.alonePath" :d="b.alonePath" class="alone" />
          <path v-if="b.assistedPath" :d="b.assistedPath" class="assisted" />
          <text v-if="b.total > 0" class="total" :x="b.x + barW / 2" :y="b.top - 8" text-anchor="middle">{{ b.total }}</text>
          <text class="week" :x="b.x + barW / 2" :y="H - 12" text-anchor="middle">{{ b.label }}</text>
        </g>
      </svg>
      <div v-if="hover !== null" class="tooltip" :style="{ left: `${((bars[hover]!.x + barW / 2) / W) * 100}%` }" role="status">
        <strong>{{ bars[hover]!.label }}</strong>
        <span><i class="sw alone" />allein: {{ bars[hover]!.alone }} min</span>
        <span><i class="sw assisted" />mit Begleitung: {{ bars[hover]!.assisted }} min</span>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.chart { margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
figcaption { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); font-size: var(--text-min); }
.title { font-weight: 700; font-size: var(--text-help); }
.legend { display: inline-flex; gap: var(--space-3); color: var(--color-text); }
.key { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 16px; height: 16px; border-radius: 4px; }
.sw.alone, .alone { background: var(--series-alone); fill: var(--series-alone); }
.sw.assisted, .assisted { background: var(--series-assisted); fill: var(--series-assisted); }
.toggle {
  margin-left: auto;
  min-height: 48px;
  padding: 0 var(--space-2);
  border: 2px solid var(--color-control-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-min);
  cursor: pointer;
}
.plot { position: relative; max-width: 820px; }
svg { width: 100%; height: auto; display: block; }
.grid line { stroke: var(--color-line); stroke-width: 1; }
.grid text, .week { fill: var(--color-text-muted); font-size: 16px; }
.total { fill: var(--color-text); font-size: 17px; font-weight: 700; }
.hit { fill: transparent; }
.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  background: var(--color-surface);
  border: 2px solid var(--color-control-border);
  color: var(--color-text);
  font-size: var(--text-min);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.15);
}
.tooltip span { display: inline-flex; align-items: center; gap: 6px; }
.table { border-collapse: collapse; font-size: var(--text-min); }
.table th, .table td { padding: 6px var(--space-2); text-align: left; border-bottom: 1px solid var(--color-line); }
.table td { font-variant-numeric: tabular-nums; }
</style>
