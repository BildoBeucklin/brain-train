<script setup lang="ts">
import type { Task } from '../types'
import type { ReverseData } from './generator'
defineProps<{ task: Task<ReverseData> }>()
</script>

<template>
  <p class="stage-word spaced">{{ task.data.shown }}</p>
</template>

<style scoped>
.spaced { letter-spacing: 0.08em; }
</style>
