<script setup lang="ts">
import { ref, watch } from 'vue'
import { PinInputInput, PinInputRoot } from 'reka-ui'
import { Delete } from 'lucide-vue-next'
import { PIN_LENGTH } from '@/lib/pin'
import { acceptTap } from '@/composables/useTap'

/** 4 große Ziffernfelder + Ziffernblock auf dem Bildschirm (Tastatur geht auch). */
defineProps<{ title: string; text?: string; error?: string }>()
const emit = defineEmits<{ complete: [pin: string] }>()

const digits = ref<string[]>([])

function press(d: string) {
  if (!acceptTap()) return
  const filled = digits.value.filter(Boolean)
  if (filled.length < PIN_LENGTH) digits.value = [...filled, d]
}
function back() {
  if (acceptTap()) digits.value = digits.value.filter(Boolean).slice(0, -1)
}

watch(digits, (v) => {
  // nur Ziffern zulassen (Tastatur)
  if (v.some((d) => d && !/^\d$/.test(d))) { digits.value = v.map((d) => (/^\d$/.test(d) ? d : '')); return }
  if (v.filter(Boolean).length === PIN_LENGTH) {
    const pin = v.join('')
    digits.value = []
    emit('complete', pin)
  }
})
</script>

<template>
  <section class="pin" aria-live="polite">
    <h1>{{ title }}</h1>
    <p v-if="text" class="text">{{ text }}</p>

    <PinInputRoot v-model="digits" type="text" mask otp class="fields" aria-label="PIN">
      <PinInputInput v-for="(_, i) in PIN_LENGTH" :key="i" :index="i" class="field" :data-testid="`pin-field-${i}`" />
    </PinInputRoot>

    <p class="error" role="alert">{{ error ?? '' }}</p>

    <div class="pad">
      <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" type="button" class="key" :data-testid="`pin-key-${d}`" @click="press(d)">{{ d }}</button>
      <span />
      <button type="button" class="key" data-testid="pin-key-0" @click="press('0')">0</button>
      <button type="button" class="key back" aria-label="Letzte Ziffer löschen" @click="back">
        <Delete :size="32" aria-hidden="true" /><span>Löschen</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
}
h1 { margin: 0; font-size: var(--text-task); }
.text { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); text-align: center; max-width: 36ch; }
.fields { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
.field {
  width: 72px;
  height: 88px;
  border: 3px solid var(--color-control-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-task);
  font-weight: 700;
  text-align: center;
}
.field:focus-visible { outline: none; box-shadow: var(--focus-shadow); }
.error { min-height: 1.5em; margin: 0; font-size: var(--text-help); font-weight: 700; color: var(--color-text); }
.pad { display: grid; grid-template-columns: repeat(3, 104px); gap: var(--space-2); }
.key {
  height: 80px;
  border: 3px solid var(--color-control-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-task);
  font-weight: 700;
  cursor: pointer;
}
.key:hover { background: var(--color-accent-soft); }
.key:active { transform: scale(0.97); }
.back { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: var(--text-min); }
.back :deep(svg) { color: var(--color-accent-text); }
</style>
