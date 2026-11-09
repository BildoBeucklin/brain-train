<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Brain } from 'lucide-vue-next'

defineProps<{ title: string; description: string }>()

const links = [
  { to: '/moderation', label: 'Moderation' },
  { to: '/praesentation', label: 'Präsentation' },
  { to: '/inhalte', label: 'Inhalte' },
  { to: '/einstellungen', label: 'Einstellungen' },
]
</script>

<template>
  <main class="placeholder">
    <Brain :size="72" aria-hidden="true" />
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <nav aria-label="Ansichten">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to">{{ l.label }}</RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.placeholder {
  min-height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  text-align: center;
  color: var(--color-primary);
}
h1 { font-size: var(--text-stage); margin: 0; color: var(--color-text); }
p { font-size: var(--text-prompt); margin: 0; color: var(--color-text-muted); }
nav { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }
a {
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
}
a.router-link-active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}
</style>
