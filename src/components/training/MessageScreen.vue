<script setup lang="ts">
/** Ruhiger Bildschirm mit einer Botschaft und großen Knöpfen (Begrüßung, Zwischen, Pause, Abschluss). */
defineProps<{ title: string; text?: string }>()
</script>

<template>
  <section class="message" aria-live="polite">
    <h1>{{ title }}</h1>
    <p v-if="text">{{ text }}</p>
    <div class="actions"><slot /></div>
  </section>
</template>

<style scoped>
.message {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-8);
  max-width: 1100px;
  margin-inline: auto;
}
h1 { margin: 0; font-size: var(--text-stage); line-height: 1.15; }
p { margin: 0; font-size: var(--text-task); color: var(--color-text-muted); line-height: 1.35; }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }
</style>
