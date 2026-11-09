<script setup lang="ts">
import { computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import { PROFILE_ICONS } from '@/components/icons'
import { acceptTap } from '@/composables/useTap'

/** Profilkachel: großes Symbol in eigener Farbe + Rufname. Ohne Symbol: „Neues Profil“. */
const props = defineProps<{ name: string; symbol?: string; selected?: boolean }>()
const emit = defineEmits<{ press: [] }>()
const icon = computed(() => (props.symbol ? PROFILE_ICONS[props.symbol] : Plus))
</script>

<template>
  <button
    type="button"
    class="tile"
    :class="{ selected, add: !symbol }"
    :aria-pressed="symbol ? selected : undefined"
    @click="acceptTap() && emit('press')"
  >
    <span class="icon" :style="symbol ? { color: `var(--profile-${symbol})` } : undefined">
      <component :is="icon" :size="72" :stroke-width="1.75" aria-hidden="true" />
    </span>
    <span class="name">{{ name }}</span>
  </button>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 200px;
  padding: var(--space-3);
  border: 3px solid var(--color-control-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-answer);
  font-weight: 700;
  cursor: pointer;
}
.tile:hover { border-color: var(--color-accent); }
.tile.selected { border-color: var(--color-accent); border-width: 6px; background: var(--color-accent-soft); }
.tile.add { border-style: dashed; color: var(--color-text-muted); font-size: var(--text-help); }
.tile.add .icon { color: var(--color-text-muted); }
.icon {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: var(--color-bg);
}
.name { overflow-wrap: anywhere; }
</style>
