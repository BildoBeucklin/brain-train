<script setup lang="ts">
import type { Task } from '../types'
import type { OppositeData } from './generator'
defineProps<{ task: Task<OppositeData> }>()
</script>

<template>
  <p class="stage-word">{{ task.data.word }}</p>
</template>
