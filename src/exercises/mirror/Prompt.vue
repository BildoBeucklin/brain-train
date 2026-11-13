<script setup lang="ts">
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { iconByName } from '@/components/icons'
import { useTrainingStore } from '@/stores/training'
import type { Task } from '../types'
import type { MirrorData } from './generator'

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
    <div class="box" :style="{ '--cols': task.data.cols }" aria-label="Vorlage">
      <span v-for="(icon, i) in task.data.left" :key="i" class="cell">
        <component :is="iconByName(icon)" :stroke-width="1.75" aria-hidden="true" />
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
        :aria-label="task.options[i]!.label"
        :data-testid="`mirror-${i}`"
        @click="tap(i)"
      >
        <component :is="iconByName(p.icon)" :class="{ flipped: !p.plain }" :stroke-width="1.75" aria-hidden="true" />
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
  grid-template-columns: auto auto auto;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  max-height: 100%;
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
  width: clamp(48px, calc((100vh - 420px) / var(--cols)), 96px);
  aspect-ratio: 1;
  color: var(--color-text);
}
.cell :deep(svg:not(.mark)) { width: 70%; height: 70%; }
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
  grid-column: 1 / -1;
  display: flex; justify-content: center; gap: var(--space-3); flex-wrap: wrap;
  margin: 0; font-size: var(--text-help);
}
.key { padding: 2px 12px; border: 3px solid transparent; border-radius: 10px; }
</style>
