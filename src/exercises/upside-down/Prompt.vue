<script setup lang="ts">
import ReadClock from '@/components/training/ReadClock.vue'
import type { Task } from '../types'
import type { UpsideDownData } from './generator'
defineProps<{ task: Task<UpsideDownData>; phase: string }>()
</script>

<template>
  <div v-if="task.data.lines" class="passage-wrap">
    <p class="sr-only">Auf dem Kopf stehender Text: {{ task.data.text }}</p>
    <div class="passage upside" aria-hidden="true" :style="{ '--lines': task.data.lines.length }">
      <p v-for="(l, i) in task.data.lines" :key="i">{{ l }}</p>
    </div>
    <ReadClock :running="phase === 'answer'" :reset-key="task" />
  </div>
  <p v-else class="stage-word"><span class="sr-only">Auf dem Kopf stehender Text: {{ task.data.text }}</span><span class="upside" aria-hidden="true">{{ task.data.text }}</span></p>
</template>

<style scoped>
.upside { display: inline-block; transform: rotate(180deg); }
.passage-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); width: 100%; }
.passage {
  width: min(100%, 72rem);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1rem, min(3cqw, calc(var(--vh) * 22 / var(--lines))), 2.5rem);
  line-height: 1.35;
  text-align: left;
}
.passage p { margin: 0; }
</style>
