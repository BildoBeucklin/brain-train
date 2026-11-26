<script setup lang="ts">
import ReadClock from '@/components/training/ReadClock.vue'
import type { Task } from '../types'
import type { StroopData } from './generator'
import { STROOP_COLORS } from './colors'
const colorName = (id: string) => STROOP_COLORS.find((c) => c.id === id)?.name ?? ''
defineProps<{ task: Task<StroopData>; phase: string }>()
</script>

<template>
  <div class="stroop">
    <div class="grid" role="list" aria-label="Farbwörter" :style="{ '--cols': task.data.cols }">
      <span v-for="(c, i) in task.data.cells" :key="i" class="cell" role="listitem" :style="{ color: `var(${c.inkVar})` }"><span aria-hidden="true">{{ c.word }}</span><span class="sr-only">{{ c.word }}, Schriftfarbe {{ colorName(c.ink) }}</span></span>
    </div>
    <ReadClock :running="phase === 'answer'" :reset-key="task" />
  </div>
</template>

<style scoped>
.stroop { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); width: 100%; }
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--space-1) var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius);
  width: min(100%, calc(var(--cols) * 11rem));
}
.cell {
  text-align: center;
  font-size: clamp(1.25rem, 3cqw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
}
</style>
