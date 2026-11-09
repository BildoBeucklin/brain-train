<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { HandHelping } from 'lucide-vue-next'

/**
 * Kleines Symbol oben rechts: 2 Sekunden gedrückt halten schaltet den betreuten Modus um,
 * damit es nicht versehentlich passiert. Ein Ring zeigt den Fortschritt.
 */
const HOLD_MS = 2000

defineProps<{ active: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const holding = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function down(e: PointerEvent | KeyboardEvent) {
  if ('repeat' in e && e.repeat) return
  holding.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { holding.value = false; emit('toggle') }, HOLD_MS)
}
function up() {
  holding.value = false
  clearTimeout(timer)
}
onBeforeUnmount(up)
</script>

<template>
  <button
    type="button"
    class="help"
    :class="{ holding, active }"
    :aria-pressed="active"
    :aria-label="active ? 'Begleitung ausschalten (2 Sekunden halten)' : 'Mit Begleitung (2 Sekunden halten)'"
    data-testid="help-toggle"
    @pointerdown="down"
    @pointerup="up"
    @pointerleave="up"
    @pointercancel="up"
    @keydown.enter.prevent="down"
    @keyup.enter="up"
    @keydown.space.prevent="down"
    @keyup.space="up"
    @contextmenu.prevent
  >
    <svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" /></svg>
    <HandHelping :size="24" aria-hidden="true" />
    <span class="text">Begleitung</span>
  </button>
</template>

<style scoped>
.help {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 12px 0 8px;
  border: 2px solid var(--color-line);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-min);
  cursor: pointer;
  user-select: none;
  touch-action: none;
}
.help.active { color: var(--color-accent-text); border-color: var(--color-accent); }
.ring { position: absolute; left: 0; top: 0; width: 48px; height: 48px; transform: rotate(-90deg); }
.ring circle {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 4;
  stroke-dasharray: 132;
  stroke-dashoffset: 132;
}
.holding .ring circle { transition: stroke-dashoffset 2s linear; stroke-dashoffset: 0; }
</style>
