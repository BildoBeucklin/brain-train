<script setup lang="ts">
import { computed } from 'vue'
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot, Toggle } from 'reka-ui'
import { Minus, Pin, Plus } from 'lucide-vue-next'
import { useProfileStore } from '@/stores/profile'
import { useTrainingStore } from '@/stores/training'

/** Niveau „− 4 +“ und „Festhalten“ für die aktuelle Übung. */
const training = useTrainingStore()
const profile = useProfileStore()
const exercise = computed(() => training.task!.exercise)

const level = computed({
  get: () => training.task!.level as number,
  set: (v: number) => { void training.changeLevel(v - training.task!.level) },
})
const locked = computed({
  get: () => profile.isLocked(exercise.value),
  set: (v: boolean) => { void training.setLocked(v) },
})
</script>

<template>
  <div class="stepper">
    <div class="level">
    <span class="label" id="level-label">Niveau</span>
    <NumberFieldRoot v-model="level" :min="1" :max="10" :step="1" class="nf" aria-labelledby="level-label" :disabled="training.stage !== 'task'">
      <NumberFieldDecrement class="nb" aria-label="Niveau senken" data-testid="cb-level-down"><Minus :size="22" /></NumberFieldDecrement>
      <NumberFieldInput class="ni" data-testid="cb-level" readonly />
      <NumberFieldIncrement class="nb" aria-label="Niveau erhöhen" data-testid="cb-level-up"><Plus :size="22" /></NumberFieldIncrement>
    </NumberFieldRoot>
    </div>
    <Toggle v-model="locked" class="lock" data-testid="cb-lock">
      <Pin :size="20" aria-hidden="true" /><span>Festhalten</span>
    </Toggle>
  </div>
</template>

<style scoped>
.stepper { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-min); white-space: nowrap; }
.level { display: flex; flex-direction: column; align-items: center; gap: 0; }
.label { color: var(--color-text); line-height: 1; }
.nf { display: inline-flex; align-items: center; border: 2px solid var(--color-control-border); border-radius: 10px; }
.nb {
  display: grid;
  place-items: center;
  width: 40px;
  height: 38px;
  border: 0;
  background: transparent;
  color: var(--color-accent-text);
  cursor: pointer;
}
.nb:disabled { color: var(--color-text-muted); cursor: default; }
.ni {
  width: 40px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  text-align: center;
}
.lock {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 64px;
  padding: 0 8px;
  border: 2px solid var(--color-control-border);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-min);
  cursor: pointer;
}
.lock :deep(svg) { color: var(--color-accent-text); }
.lock[data-state='on'] { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }
.lock[data-state='on'] :deep(svg) { color: var(--color-on-accent); }
</style>
