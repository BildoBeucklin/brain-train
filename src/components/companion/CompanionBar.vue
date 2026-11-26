<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay,
  AlertDialogPortal, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger,
  PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger,
  ToolbarButton, ToolbarRoot, ToolbarSeparator,
} from 'reka-ui'
import { CircleHelp, CircleStop, Eye, Info, Lightbulb, Pause, SkipForward, ThumbsUp } from 'lucide-vue-next'
import { band } from '@/exercises/levels'
import { registry } from '@/exercises/registry'
import { acceptTap } from '@/composables/useTap'
import { useTrainingStore } from '@/stores/training'
import LevelStepper from './LevelStepper.vue'

/** Begleitleiste (nur betreuter Modus): 72 px, unten, Schrift 20 px für die Begleitperson. */
const training = useTrainingStore()
const task = computed(() => training.task)
const tip = computed(() => (task.value ? registry[task.value.exercise].companionTips[band(task.value.level)] : ''))
const answering = computed(() => training.stage === 'task' && !!task.value && !training.done)

const peeking = ref(false)
const solutionText = computed(() => {
  const t = task.value
  if (!t) return ''
  if (t.open) return t.explanation ?? ''
  return t.options.filter((o) => t.correctIds.includes(o.id)).map((o) => o.label).join(', ')
})

const run = (fn: () => void) => () => { if (acceptTap()) fn() }
</script>

<template>
  <ToolbarRoot class="bar" aria-label="Begleitleiste" data-testid="companion-bar">
    <PopoverRoot>
      <PopoverTrigger as-child>
        <ToolbarButton class="tb" data-testid="cb-tip"><Info :size="20" aria-hidden="true" /><span>Tipp</span></ToolbarButton>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent class="tip" side="top" :side-offset="8" data-testid="cb-tip-text">{{ tip }}</PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <ToolbarButton class="tb" :disabled="!answering || !!task?.open" data-testid="cb-hint" @click="run(training.hint)()">
      <Lightbulb :size="20" aria-hidden="true" /><span>Hinweis geben</span>
    </ToolbarButton>

    <ToolbarButton
      class="tb"
      :disabled="!task"
      data-testid="cb-peek"
      @pointerdown="peeking = true"
      @pointerup="peeking = false"
      @pointerleave="peeking = false"
      @pointercancel="peeking = false"
      @keydown.space.prevent="peeking = true"
      @keyup.space="peeking = false"
      @contextmenu.prevent
    >
      <Eye :size="20" aria-hidden="true" /><span>Lösung ansehen</span>
    </ToolbarButton>
    <span v-if="peeking && solutionText" class="peek" data-testid="cb-solution">Lösung: {{ solutionText }}</span>

    <ToolbarSeparator class="sep" />

    <ToolbarButton class="tb" :disabled="!answering" data-testid="cb-right" @click="run(() => training.judge(true))()">
      <ThumbsUp :size="20" aria-hidden="true" /><span>Mündlich richtig</span>
    </ToolbarButton>
    <ToolbarButton class="tb" :disabled="!answering" data-testid="cb-unknown" @click="run(() => training.judge(false))()">
      <CircleHelp :size="20" aria-hidden="true" /><span>Nicht gewusst</span>
    </ToolbarButton>
    <ToolbarButton class="tb" :disabled="training.stage !== 'task'" data-testid="cb-skip" @click="run(training.skip)()">
      <SkipForward :size="20" aria-hidden="true" /><span>Überspringen</span>
    </ToolbarButton>

    <ToolbarSeparator class="sep" />

    <LevelStepper v-if="task" />

    <ToolbarSeparator class="sep" />

    <ToolbarButton class="tb" data-testid="cb-pause" @click="run(training.pause)()">
      <Pause :size="20" aria-hidden="true" /><span>Pause</span>
    </ToolbarButton>

    <AlertDialogRoot>
      <AlertDialogTrigger as-child>
        <ToolbarButton class="tb" data-testid="cb-end"><CircleStop :size="20" aria-hidden="true" /><span>Beenden</span></ToolbarButton>
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay class="dlg-overlay" />
        <AlertDialogContent class="dlg">
          <AlertDialogTitle class="dlg-title">Einheit beenden?</AlertDialogTitle>
          <AlertDialogDescription class="dlg-text">Die bisher geübte Zeit wird gespeichert.</AlertDialogDescription>
          <div class="dlg-actions">
            <AlertDialogCancel class="dlg-btn">Weiter trainieren</AlertDialogCancel>
            <AlertDialogAction class="dlg-btn primary" data-testid="cb-end-confirm" @click="training.finish()">Beenden</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </ToolbarRoot>
</template>

<style scoped>
.bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  flex-wrap: wrap;
  min-height: var(--companion-height);
  padding: 2px var(--space-1);
  background: var(--color-surface);
  border-top: 2px solid var(--color-line);
  font-size: var(--text-min);
  overflow: visible;
}
.tb {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 68px;
  padding: 0 8px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-min);
  cursor: pointer;
}
/* zweizeilige Beschriftung („Mündlich / richtig“), damit die Leiste auch auf 1280 px passt */
.tb span { width: min-content; text-align: center; line-height: 1.1; }
.tb:hover:not(:disabled) { background: var(--color-accent-soft); border-color: var(--color-control-border); }
.tb:disabled { color: var(--color-text-muted); cursor: default; opacity: 0.7; }
.tb :deep(svg) { color: var(--color-accent-text); flex: none; }
.sep { width: 2px; height: 40px; background: var(--color-line); margin: 0 2px; flex: none; }
.peek {
  position: absolute;
  bottom: calc(100% + 8px);
  left: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: 10px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: var(--text-min);
  font-weight: 700;
}
</style>

<style>
.tip {
  max-width: min(420px, calc(var(--vw) * 90));
  padding: var(--space-2);
  border-radius: 12px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: var(--text-min);
  line-height: 1.4;
  box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
}
</style>
