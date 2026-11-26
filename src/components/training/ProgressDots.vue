<script setup lang="ts">
/** Fortschritt im Block: ausgefüllt = erledigt, ohne richtig/falsch zu unterscheiden. */
defineProps<{ total: number; done: number }>()
</script>

<template>
  <div class="dots" role="img" :aria-label="`Aufgabe ${Math.min(done + 1, total)} von ${total}`">
    <span v-for="i in total" :key="i" class="dot" :class="{ filled: i <= done, current: i === done + 1 }" />
  </div>
</template>

<style scoped>
.dots { display: flex; gap: var(--space-2); align-items: center; }
.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid var(--color-control-border);
  background: transparent;
}
.dot.filled { background: var(--color-accent); border-color: var(--color-accent); }
.dot.current { border-color: var(--color-accent); border-width: 4px; }
</style>
