<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/** Laufende Uhr (mm:ss) für Vorlese-Aufgaben; hält an, sobald die Aufgabe beantwortet ist. */
const props = defineProps<{ running: boolean; resetKey: unknown }>()

const start = ref(Date.now())
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
function run() { stop(); timer = setInterval(() => { now.value = Date.now() }, 250) }
function stop() { if (timer) clearInterval(timer); timer = undefined }
watch(() => props.running, (r) => { now.value = Date.now(); r ? run() : stop() }, { immediate: true })
watch(() => props.resetKey, () => { start.value = now.value = Date.now(); if (props.running) run() })
onBeforeUnmount(stop)

const elapsed = computed(() => {
  const s = Math.floor((now.value - start.value) / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
</script>

<template>
  <p class="clock" aria-label="Verstrichene Zeit" data-testid="read-clock">{{ elapsed }}</p>
</template>

<style scoped>
.clock { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
</style>
