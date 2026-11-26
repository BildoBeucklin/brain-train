<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Check, Square, SquareCheck } from 'lucide-vue-next'
import { acceptTap } from '@/composables/useTap'

export type AnswerState = 'default' | 'selected' | 'correct' | 'eliminated' | 'solution' | 'inactive'

/**
 * Antwortfläche: ganze Fläche klickbar, mind. 96 × 280 px.
 * Zustände: Standard, Ausgewählt (Mehrfachauswahl), Richtig, Ausgegraut (nach Fehler), Lösung, Inaktiv (nach Auflösung).
 * Hover, Fokus und Gedrückt kommen über CSS.
 */
const props = defineProps<{
  label: string
  state: AnswerState
  multi?: boolean
  swatch?: string // CSS-Variable, Farbübung
  icon?: Component // Merken-Karten
  image?: string // Einkaufen: Bild-URL
  count?: number // Einkaufen: so oft wird das Bild gezeigt
}>()
const emit = defineEmits<{ press: [] }>()

const clickable = computed(() => props.state === 'default' || props.state === 'selected')
const statusText = computed(() =>
  props.state === 'correct' ? 'Richtig!'
    : props.state === 'solution' ? (props.multi ? 'Das war dabei' : 'Das ist die richtige Antwort')
    : '')

function onClick() {
  if (clickable.value && acceptTap()) emit('press')
}
</script>

<template>
  <button
    type="button"
    class="answer"
    :class="[`is-${state}`, { 'with-icon': !!icon || !!image }]"
    :disabled="!clickable"
    :aria-pressed="multi ? state === 'selected' : undefined"
    @click="onClick"
  >
    <span v-if="multi && clickable" class="check" aria-hidden="true">
      <SquareCheck v-if="state === 'selected'" :size="32" :stroke-width="2.5" />
      <Square v-else :size="32" :stroke-width="2" />
    </span>
    <span v-if="swatch" class="swatch" :style="{ background: `var(${swatch})` }" aria-hidden="true" />
    <component :is="icon" v-if="icon" class="card-icon" :size="44" :stroke-width="1.75" aria-hidden="true" />
    <span v-if="image" class="pics" aria-hidden="true">
      <img v-for="n in Math.min(count ?? 1, 4)" :key="n" :src="image" alt="" />
    </span>
    <span class="text">
      <span class="label">{{ label }}</span>
      <span v-if="statusText" class="status">
        <Check :size="28" :stroke-width="3" aria-hidden="true" />
        {{ statusText }}
      </span>
    </span>
  </button>
</template>

<style scoped>
.answer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: var(--answer-min-height);
  min-width: var(--answer-min-width);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 3px solid var(--color-control-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-answer);
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition: background-color 120ms, border-color 120ms, transform 80ms;
}
.answer:hover:not(:disabled) { background: var(--color-accent-soft); border-color: var(--color-accent); }
.answer:active:not(:disabled) { transform: scale(0.98); }
.answer:disabled { cursor: default; }

/* Karten mit Icon (Merken): Icon neben dem Text, damit 9 Karten auf den Bildschirm passen */
.with-icon { flex-direction: row; gap: var(--space-2); }
.text { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.with-icon .text { align-items: flex-start; text-align: left; }

.is-selected { background: var(--color-accent-soft); border-color: var(--color-accent); border-width: 5px; }
.check { position: absolute; top: 50%; transform: translateY(-50%); left: var(--space-2); color: var(--color-accent-text); display: flex; }

.is-correct, .is-solution {
  border-color: var(--color-success-border);
  border-width: 6px;
  background: var(--color-success-bg);
}
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-help);
  color: var(--color-text);
}
.status :deep(svg) { color: var(--color-success-border); }

/* Nach einem Fehler: ruhig grau, nur leicht durchgestrichen */
.is-eliminated {
  background: var(--color-neutral-bg);
  border-color: var(--color-neutral-bg);
  color: var(--color-neutral-text);
}
.is-eliminated .label {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: color-mix(in srgb, var(--color-neutral-text) 50%, transparent);
}
.is-eliminated .swatch, .is-eliminated .card-icon { opacity: 0.45; }

.is-inactive { color: var(--color-text-muted); border-color: var(--color-line); }

.swatch {
  width: 72px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid var(--color-control-border);
}
.card-icon { color: var(--color-accent-text); }
.pics { display: flex; flex: none; }
.pics img { width: 56px; height: 56px; object-fit: contain; }
.pics img + img { margin-left: -20px; }
.is-eliminated .pics { opacity: 0.45; }
</style>
