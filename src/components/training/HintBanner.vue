<script setup lang="ts">
import { Lightbulb } from 'lucide-vue-next'

/** Ruhiger Hinweis nach dem ersten Fehler – kein Rot, kein Warnsymbol. */
defineProps<{ text: string }>()
</script>

<template>
  <div class="hint">
    <Lightbulb class="icon" :size="36" :stroke-width="2" aria-hidden="true" />
    <p><strong>Schauen Sie noch einmal genau hin.</strong> {{ text }}</p>
  </div>
</template>

<style scoped>
.hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  background: var(--color-accent-soft);
  color: var(--color-text);
  font-size: var(--text-help);
  text-align: left;
}
.icon { flex: none; color: var(--color-accent-text); margin-top: 2px; }
p { margin: 0; }
</style>
