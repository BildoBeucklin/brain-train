<script setup lang="ts">
import { computed, watch } from 'vue'
import { Check, ChevronRight, Pause } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { iconByName } from '@/components/icons'
import { prompts } from '@/exercises/prompts'
import { registry } from '@/exercises/registry'
import { productImage } from '@/exercises/shopping/images'
import { playSoftChime } from '@/composables/useSound'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'
import AnswerButton, { type AnswerState } from './AnswerButton.vue'
import AnswerGrid from './AnswerGrid.vue'
import HintBanner from './HintBanner.vue'
import HelpToggle from '@/components/companion/HelpToggle.vue'
import { MessageCircle } from 'lucide-vue-next'
import ProgressDots from './ProgressDots.vue'
import DisplayControls from '@/components/DisplayControls.vue'

const training = useTrainingStore()
const settings = useSettingsStore()

const task = computed(() => training.task!)
const def = computed(() => registry[task.value.exercise])
const prompt = computed(() => prompts[task.value.exercise])
const memorizing = computed(() => training.phase === 'memorize')
const promptText = computed(() => (memorizing.value ? task.value.memorize!.prompt : task.value.prompt))
/** Begründung auch beim Treffer zeigen, wo sie etwas erklärt (Was passt nicht?). */
const showExplanation = computed(() =>
  training.phase === 'solution' || (training.phase === 'correct' && task.value.exercise === 'oddOneOut'))

function stateOf(id: string): AnswerState {
  const correct = task.value.correctIds.includes(id)
  if (training.eliminated.includes(id)) return 'eliminated'
  if (training.done) return correct ? (training.phase === 'correct' ? 'correct' : 'solution') : 'inactive'
  if (training.selected.includes(id)) return 'selected'
  return 'default'
}

watch(() => training.phase, (p) => { if (p === 'correct' && settings.values.sound) playSoftChime() })

/** Screenreader: Rückmeldung nach dem Antworten (sichtbar ist sie an den Antwortflächen). */
const status = computed(() => {
  const t = task.value
  const right = t.options.filter((o) => t.correctIds.includes(o.id)).map((o) => o.label).join(', ')
  if (training.phase === 'correct') return `Richtig! ${t.explanation ?? ''}`
  if (training.phase === 'solution') return `Die richtige Antwort: ${right}. ${t.explanation ?? ''}`
  if (training.hintVisible) return `Noch nicht ganz. ${t.hint}`
  if (task.value.select === 'multi' && training.selected.length) return `${training.selected.length} ausgewählt`
  return ''
})
</script>

<template>
  <section class="task-screen" :data-exercise="task.exercise" :data-phase="training.phase">
    <header class="top">
      <div class="where">
        <component :is="iconByName(def.icon)" :size="32" aria-hidden="true" />
        <span>{{ def.label }}</span>
        <ProgressDots :total="training.blockSize" :done="training.blockIndex + (training.done ? 1 : 0)" />
      </div>
      <div class="top-right">
        <DisplayControls />
        <HelpToggle :active="training.assisted" @toggle="training.setAssisted(!training.assisted)" />
        <BigButton label="Pause" :icon="Pause" data-testid="pause" @press="training.pause()" />
      </div>
    </header>

    <p class="sr-only" role="status" aria-live="polite" data-testid="sr-status">{{ status }}</p>

    <h1 class="prompt">{{ task.open && !memorizing ? task.open.prompt : promptText }}</h1>

    <div class="stage">
      <component :is="prompt" :task="task" :phase="training.phase" />
    </div>

    <div v-if="task.open && !memorizing" class="open-note" data-testid="open-task">
      <MessageCircle :size="32" aria-hidden="true" />
      <span>Bitte antworten Sie mündlich. Ihre Begleitung hört zu.</span>
    </div>

    <AnswerGrid v-else-if="!memorizing && !task.custom" :count="task.options.length" class="answers">
      <AnswerButton
        v-for="o in task.options"
        :key="o.id"
        :label="o.label"
        :swatch="o.swatch"
        :icon="iconByName(o.icon)"
        :image="productImage(o.image)"
        :count="o.count"
        :multi="task.select === 'multi'"
        :state="stateOf(o.id)"
        :data-testid="`answer-${o.id}`"
        @press="training.answer(o.id)"
      />
    </AnswerGrid>

    <footer class="bottom">
      <HintBanner v-if="training.hintVisible" :text="task.hint" />
      <p v-if="showExplanation && task.explanation" class="explanation">{{ task.explanation }}</p>

      <div class="actions">
        <BigButton
          v-if="memorizing"
          label="Ich habe sie mir gemerkt"
          :icon="Check"
          variant="primary"
          size="large"
          data-testid="memorized"
          @press="training.memorized()"
        />
        <BigButton
          v-else-if="task.select === 'multi' && !training.done"
          :label="task.submitLabel ?? 'Fertig'"
          :icon="Check"
          variant="primary"
          size="large"
          :disabled="training.selected.length === 0"
          data-testid="submit"
          @press="training.submit()"
        />
        <BigButton
          v-if="training.done"
          label="Weiter"
          :icon="ChevronRight"
          variant="primary"
          size="large"
          data-testid="next"
          @press="training.proceed()"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.task-screen {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-2) var(--space-6) var(--space-3);
  max-width: 1600px;
  margin-inline: auto;
}
.top-right { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.open-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius);
  background: var(--color-surface);
  font-size: var(--text-answer);
}
.open-note :deep(svg) { color: var(--color-accent-text); flex: none; }
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
.where {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-help);
  color: var(--color-text-muted);
}
.where :deep(.dots) { margin-left: var(--space-3); }
.prompt { margin: 0; font-size: var(--text-task); line-height: 1.25; text-align: left; }
.stage { display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; min-width: 0; container-type: inline-size; }
.bottom { display: flex; flex-direction: column; gap: var(--space-2); min-height: 96px; justify-content: flex-end; }
.explanation { margin: 0; font-size: var(--text-help); font-weight: 700; text-align: left; }
.actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
.actions:empty { display: none; }
</style>
