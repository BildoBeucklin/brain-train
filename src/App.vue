<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'

const ready = ref(false)
const failed = ref(false)

// Strg + Plus / Minus / 0 und Strg + Mausrad: ganze Oberfläche größer/kleiner (statt Browser-Zoom)
function onKey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const settings = useSettingsStore()
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); void settings.zoomBy(1) }
  else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); void settings.zoomBy(-1) }
  else if (e.key === '0' || e.code === 'Numpad0') { e.preventDefault(); void settings.set('zoom', 1) }
}
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  void useSettingsStore().zoomBy(e.deltaY < 0 ? 1 : -1)
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('wheel', onWheel, { passive: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('wheel', onWheel)
})

onMounted(async () => {
  try {
    await Promise.all([useSettingsStore().load(), useContentStore().load(), useProfileStore().load()])
    ready.value = true
  } catch (e) {
    console.error(e)
    failed.value = true
  }
})
</script>

<template>
  <RouterView v-if="ready" />
  <main v-else-if="failed" class="boot">
    <p>Die Daten konnten nicht geladen werden. Bitte starten Sie das Programm neu.</p>
  </main>
  <main v-else class="boot" aria-busy="true" />
</template>

<style scoped>
.boot { display: grid; place-items: center; height: 100%; font-size: var(--text-task); padding: var(--space-6); }
</style>
