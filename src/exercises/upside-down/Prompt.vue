<script setup lang="ts">
import type { Task } from '../types'
import type { UpsideDownData } from './generator'
defineProps<{ task: Task<UpsideDownData> }>()
</script>

<template>
  <p class="stage-word upside" :aria-label="`Auf dem Kopf stehender Text`">{{ task.data.text }}</p>
</template>

<style scoped>
.upside { transform: rotate(180deg); }
</style>
