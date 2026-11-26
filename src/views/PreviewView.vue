<script setup lang="ts">
// Nur im Entwicklungsmodus: /#/vorschau?exercise=memory&level=9&seed=1
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import TaskScreen from '@/components/training/TaskScreen.vue'
import type { ExerciseId } from '@/db/database'
import { clampLevel } from '@/exercises/levels'
import { useTrainingStore } from '@/stores/training'

const route = useRoute()
const training = useTrainingStore()

watchEffect(() => {
  training.preview((route.query.exercise as ExerciseId) ?? 'stroop', clampLevel(Number(route.query.level ?? 2)))
})
</script>

<template>
  <main class="training"><TaskScreen v-if="training.task" /></main>
</template>

<style scoped>
.training { height: 100%; }
</style>
