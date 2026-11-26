<script setup lang="ts">
import { Minus, Power } from 'lucide-vue-next'
import { isTauri } from '@/lib/files'

/** Nur in der Desktop-App (Vollbild): Fenster verkleinern oder die App beenden. */
const desktop = isTauri()

async function win() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}
async function minimize() { await (await win()).minimize() }
async function quit() { await (await win()).close() }
</script>

<template>
  <div v-if="desktop" class="window-controls">
    <button type="button" class="wc" data-testid="window-minimize" @click="minimize">
      <Minus :size="22" aria-hidden="true" /><span>Verkleinern</span>
    </button>
    <button type="button" class="wc" data-testid="window-close" @click="quit">
      <Power :size="22" aria-hidden="true" /><span>Beenden</span>
    </button>
  </div>
</template>

<style scoped>
.window-controls { display: flex; gap: var(--space-1); }
.wc {
  display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 var(--space-2);
  border: 2px solid var(--color-line); border-radius: 999px; background: transparent; color: var(--color-text-muted);
  font-size: var(--text-min); cursor: pointer;
}
.wc:hover { border-color: var(--color-control-border); color: var(--color-text); }
</style>
