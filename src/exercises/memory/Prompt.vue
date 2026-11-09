<script setup lang="ts">
import { iconByName } from '@/components/icons'
import type { Task } from '../types'
import type { MemoryData } from './generator'

defineProps<{ task: Task<MemoryData>; phase: string }>()
</script>

<template>
  <ul v-if="phase === 'memorize'" class="cards" :style="{ '--n': Math.min(task.data.shown.length, 4) }">
    <li v-for="thing in task.data.shown" :key="thing" class="card">
      <component :is="iconByName(task.data.icons[thing])" :size="80" :stroke-width="1.5" aria-hidden="true" />
      <span>{{ thing }}</span>
    </li>
  </ul>
  <span v-else class="empty" />
</template>

<style scoped>
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(200px, 260px));
  gap: var(--space-3);
  justify-content: center;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 3px solid var(--color-line);
  font-size: var(--text-answer);
  font-weight: 700;
  color: var(--color-text);
}
.card :deep(svg) { color: var(--color-accent-text); }
</style>
