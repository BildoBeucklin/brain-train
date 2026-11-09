<script setup lang="ts">
import type { Task } from '../types'
import type { ProverbData } from './generator'
defineProps<{ task: Task<ProverbData> }>()
</script>

<template>
  <blockquote class="quote">
    <template v-if="task.data.mode === 'meaning'">„{{ task.data.start }} {{ task.data.end }}“</template>
    <template v-else>„{{ task.data.start }} …“</template>
  </blockquote>
</template>

<style scoped>
.quote {
  margin: 0;
  max-width: 28ch;
  font-size: var(--text-stage-quote, calc(3rem * var(--font-scale)));
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}
</style>
