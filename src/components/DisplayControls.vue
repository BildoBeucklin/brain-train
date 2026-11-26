<script setup lang="ts">
import { computed } from 'vue'
import { Contrast, Minus, Plus } from 'lucide-vue-next'
import { ZOOM_STEPS, useSettingsStore } from '@/stores/settings'

/** Immer erreichbar: Oberfläche kleiner/größer und hoher Kontrast. */
const settings = useSettingsStore()
const percent = computed(() => `${Math.round(settings.values.zoom * 100)} %`)
const atMin = computed(() => settings.values.zoom <= ZOOM_STEPS[0])
const atMax = computed(() => settings.values.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!)
</script>

<template>
  <div class="display-controls" role="group" aria-label="Darstellung">
    <button type="button" class="dc" :disabled="atMin" aria-label="Kleiner" data-testid="zoom-out" @click="settings.zoomBy(-1)">
      <Minus :size="22" aria-hidden="true" /><span aria-hidden="true">A</span>
    </button>
    <span class="value" aria-live="polite"><span class="sr-only">Größe </span>{{ percent }}</span>
    <button type="button" class="dc" :disabled="atMax" aria-label="Größer" data-testid="zoom-in" @click="settings.zoomBy(1)">
      <Plus :size="22" aria-hidden="true" /><span aria-hidden="true" class="big-a">A</span>
    </button>
    <button
      type="button"
      class="dc"
      :aria-pressed="settings.values.contrast"
      data-testid="contrast-toggle"
      title="Hoher Kontrast"
      @click="settings.set('contrast', !settings.values.contrast)"
    >
      <Contrast :size="24" aria-hidden="true" /><span class="sr-only">Hoher Kontrast</span>
    </button>
  </div>
</template>

<style scoped>
.display-controls { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.dc {
  display: inline-flex; align-items: center; gap: 4px; min-height: 48px; min-width: 48px; padding: 0 var(--space-1);
  border: 2px solid var(--color-line); border-radius: 999px; background: transparent; color: var(--color-text-muted);
  font-size: var(--text-min); font-weight: 700; cursor: pointer;
}
.dc:hover:not(:disabled) { border-color: var(--color-control-border); color: var(--color-text); }
.dc:disabled { opacity: 0.4; cursor: default; }
.dc[aria-pressed='true'] { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }
.big-a { font-size: 1.3em; line-height: 1; }
.value { min-width: 4.5ch; text-align: center; font-size: var(--text-min); color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
</style>
