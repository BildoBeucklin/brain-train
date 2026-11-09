<script setup lang="ts">
import type { Task } from '../types'
import type { StroopData } from './generator'
defineProps<{ task: Task<StroopData> }>()
</script>

<template>
  <p class="stage-word" :style="{ color: `var(${task.data.inkVar})` }">{{ task.data.word }}</p>
</template>
