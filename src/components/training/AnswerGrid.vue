<script setup lang="ts">
import { computed } from 'vue'

/** Raster für 2–9 Antworten: 2 nebeneinander, 3 in einer Reihe, 4 als 2×2, 5–6 und 9 in Dreierreihen. */
const props = defineProps<{ count: number }>()
const columns = computed(() => (props.count === 4 ? 2 : props.count === 2 ? 2 : 3))
</script>

<template>
  <div class="grid" :style="{ '--cols': columns }" role="group" aria-label="Antworten">
    <slot />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(max(min(var(--answer-min-width), 100%), calc((100% - (var(--cols) - 1) * var(--answer-gap)) / var(--cols))), 1fr));
  gap: var(--answer-gap);
  width: 100%;
  max-width: calc(var(--cols) * 400px + (var(--cols) - 1) * var(--answer-gap));
  margin-inline: auto;
}
</style>
