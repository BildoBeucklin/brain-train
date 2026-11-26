<script setup lang="ts">
import type { Component } from 'vue'
import { acceptTap } from '@/composables/useTap'

/** Großer Knopf mit Icon und Text (Icons nie allein). Klicks sind entprellt. */
const props = withDefaults(defineProps<{
  label: string
  icon?: Component
  variant?: 'primary' | 'secondary'
  size?: 'normal' | 'large'
  disabled?: boolean
}>(), { variant: 'secondary', size: 'normal' })

const emit = defineEmits<{ press: [] }>()

function onClick() {
  if (!props.disabled && acceptTap()) emit('press')
}
</script>

<template>
  <button type="button" class="big-button" :class="[variant, size]" :disabled="disabled" @click="onClick">
    <component :is="icon" v-if="icon" :size="size === 'large' ? 36 : 28" :stroke-width="2.25" aria-hidden="true" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.big-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 72px;
  min-width: min(200px, 100%);
  max-width: 100%;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius);
  border: 3px solid var(--color-control-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-help);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 120ms, transform 80ms;
}
.big-button.large { min-height: 96px; min-width: min(320px, 100%); font-size: var(--text-answer); }
.big-button.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }
.big-button:hover:not(:disabled) { background: var(--color-accent-soft); }
.big-button.primary:hover:not(:disabled) { background: var(--color-accent); filter: brightness(1.1); }
.big-button:active:not(:disabled) { transform: scale(0.98); }
.big-button:disabled { opacity: 0.6; cursor: default; }
</style>
