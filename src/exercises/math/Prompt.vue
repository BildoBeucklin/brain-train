<script setup lang="ts">
import type { Task } from '../types'
import { euro, type MathData } from './generator'
defineProps<{ task: Task<MathData> }>()
</script>

<template>
  <div v-if="task.data.kind === 'dots'" class="dots" role="img" :aria-label="`${task.data.count} Punkte`">
    <span v-for="i in task.data.count" :key="i" class="dot" />
  </div>
  <p v-else-if="task.data.kind === 'term'" class="stage-word">{{ task.data.text }} = ?</p>
  <table v-else class="receipt">
    <tbody>
      <tr v-for="item in task.data.items" :key="item.name">
        <th scope="row">{{ item.name }}</th>
        <td>{{ euro(item.cents) }}</td>
      </tr>
      <tr v-if="task.data.kind === 'change'" class="paid">
        <th scope="row">Bezahlt</th>
        <td>{{ euro(task.data.paidCents) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-4);
  max-width: 560px;
}
.dot { width: 80px; height: 80px; border-radius: 50%; background: var(--color-accent); }
.receipt {
  border-collapse: collapse;
  min-width: 420px;
  font-size: var(--text-task);
  background: var(--color-surface);
  border-radius: var(--radius);
  overflow: hidden;
}
.receipt th, .receipt td { padding: var(--space-1) var(--space-3); }
.receipt th { text-align: left; font-weight: 400; }
.receipt td { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.receipt .paid { border-top: 3px solid var(--color-control-border); }
</style>
