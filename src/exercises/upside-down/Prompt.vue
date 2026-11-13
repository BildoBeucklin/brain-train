<script setup lang="ts">
import ReadClock from '@/components/training/ReadClock.vue'
import type { Task } from '../types'
import type { UpsideDownData } from './generator'
defineProps<{ task: Task<UpsideDownData>; phase: string }>()
</script>

<template>
  <div v-if="task.data.lines" class="passage-wrap">
    <div class="passage upside" aria-label="Auf dem Kopf stehender Text">
      <p v-for="(l, i) in task.data.lines" :key="i">{{ l }}</p>
    </div>
    <ReadClock :running="phase === 'answer'" :reset-key="task" />
  </div>
  <p v-else class="stage-word upside" aria-label="Auf dem Kopf stehender Text">{{ task.data.text }}</p>
</template>

<style scoped>
.upside { transform: rotate(180deg); }
.passage-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); width: 100%; }
.passage {
  width: min(100%, 60rem);
  padding: var(--space-3) var(--space-5);
  background: var(--color-surface);
  border-radius: var(--radius);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.5rem, 4vh, 2.5rem);
  line-height: 1.4;
  text-align: left;
}
.passage p { margin: 0; }
</style>
