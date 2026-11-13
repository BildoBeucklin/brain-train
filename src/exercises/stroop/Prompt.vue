<script setup lang="ts">
import ReadClock from '@/components/training/ReadClock.vue'
import type { Task } from '../types'
import type { StroopData } from './generator'
defineProps<{ task: Task<StroopData>; phase: string }>()
</script>

<template>
  <div class="stroop">
    <div class="grid" :style="{ '--cols': task.data.cols }">
      <span v-for="(c, i) in task.data.cells" :key="i" class="cell" :style="{ color: `var(${c.inkVar})` }">{{ c.word }}</span>
    </div>
    <ReadClock :running="phase === 'answer'" :reset-key="task" />
  </div>
</template>

<style scoped>
.stroop { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); width: 100%; }
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius);
  width: min(100%, calc(var(--cols) * 11rem));
}
.cell {
  text-align: center;
  font-size: clamp(1.5rem, 4vh, 2.75rem);
  font-weight: 700;
  line-height: 1.2;
}
</style>
