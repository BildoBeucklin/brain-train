<script setup lang="ts">
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { useTrainingStore } from '@/stores/training'
import type { Task } from '../types'
import { MIRROR_PICTURES, type MirrorData } from './generator'
import { SILHOUETTES } from './silhouettes'

const pictureName = (icon: string) => MIRROR_PICTURES.find((p) => p.icon === icon)?.name ?? icon
const RESULT = { plain: '', picked: '', found: ', gefunden', wrong: ', war gespiegelt', missed: ', übersehen' } as const

const props = defineProps<{ task: Task<MirrorData>; phase: string }>()
const training = useTrainingStore()

const printing = computed(() => props.phase === 'print')
const done = computed(() => props.phase === 'correct' || props.phase === 'solution')
const selected = computed(() => (printing.value ? [] : training.selected))

/** Zustand eines Bildes rechts; nach dem Abschluss: gefunden, falsch angetippt, übersehen. */
function state(i: number): 'plain' | 'picked' | 'found' | 'wrong' | 'missed' {
  const id = `p${i}`
  const picked = selected.value.includes(id)
  const odd = props.task.correctIds.includes(id)
  if (!done.value) return picked ? 'picked' : 'plain'
  if (picked) return odd ? 'found' : 'wrong'
  return odd ? 'missed' : 'plain'
}

function tap(i: number) {
  if (!done.value && !printing.value) training.answer(`p${i}`)
}
</script>

<template>
  <div class="mirror">
    <div class="box" :style="{ '--cols': task.data.cols }" role="list" aria-label="Vorlage">
      <span v-for="(icon, i) in task.data.left" :key="i" class="cell" role="listitem">
        <span class="pic" v-html="SILHOUETTES[icon]" />
        <span class="sr-only">{{ pictureName(icon) }}</span>
      </span>
    </div>

    <div class="mirror-line" aria-hidden="true" />

    <div class="box" :style="{ '--cols': task.data.cols }" role="group" aria-label="Spiegelbild">
      <button
        v-for="(p, i) in task.data.right"
        :key="i"
        type="button"
        class="cell pick"
        :class="`is-${state(i)}`"
        :disabled="done || printing"
        :aria-pressed="selected.includes(`p${i}`)"
        :aria-label="`${task.options[i]!.label}: ${pictureName(p.icon)}${RESULT[state(i)]}`"
        :data-testid="`mirror-${i}`"
        @click="tap(i)"
      >
        <span class="pic" :class="{ flipped: !p.plain }" v-html="SILHOUETTES[p.icon]" />
        <Check v-if="state(i) === 'found'" class="mark" :size="24" :stroke-width="3" aria-hidden="true" />
        <X v-else-if="state(i) === 'wrong'" class="mark" :size="24" :stroke-width="3" aria-hidden="true" />
      </button>
    </div>

    <p v-if="done" class="legend">
      <span class="key is-found">gefunden</span>
      <span class="key is-missed">übersehen</span>
      <span class="key is-wrong">war gespiegelt</span>
    </p>
  </div>
</template>

<style scoped>
.mirror {
  display: grid;
  grid-template-columns: auto auto auto auto;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}
@container (max-width: 640px) {
  .mirror { grid-template-columns: auto; }
  .mirror-line { width: auto; height: 4px; }
  .legend { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .cell { width: clamp(40px, calc((100cqw - 80px) / var(--cols)), 96px); }
}
.box {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 3px solid var(--color-line);
  border-radius: var(--radius);
}
.cell {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(40px, min(calc((100cqw - 160px) / (2 * var(--cols))), calc((var(--vh) * 100 - 540px) / var(--cols))), 96px);
  aspect-ratio: 1;
  color: var(--color-text);
}
.pic { display: grid; place-items: center; width: 75%; height: 75%; }
.pic :deep(svg) { width: 100%; height: 100%; }
.flipped { transform: scaleX(-1); }
.mirror-line { width: 4px; align-self: stretch; border-radius: 2px; background: var(--color-line); }

.pick {
  border: 3px solid transparent;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}
.pick:hover:not(:disabled) { background: var(--color-accent-soft); }
.pick:disabled { cursor: default; }
.is-picked { background: var(--color-accent-soft); border-color: var(--color-accent); }
.is-found { background: var(--color-success-bg); border-color: var(--color-success-border); }
.is-missed { border-color: var(--color-accent); border-style: dashed; background: var(--color-accent-soft); }
.is-wrong { background: var(--color-neutral-bg); border-color: var(--color-neutral-bg); color: var(--color-neutral-text); }
.mark { position: absolute; top: 2px; right: 2px; }
.is-found .mark { color: var(--color-success-border); }

.legend {
  display: flex; flex-direction: column; gap: var(--space-1);
  margin: 0; font-size: var(--text-help);
}
.key { padding: 2px 12px; border: 3px solid transparent; border-radius: 10px; }
</style>
