<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Check, ChevronRight, Coffee, House, Pause, Play } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import MessageScreen from '@/components/training/MessageScreen.vue'
import TaskScreen from '@/components/training/TaskScreen.vue'
import CompanionBar from '@/components/companion/CompanionBar.vue'
import { useKeyboard } from '@/composables/useKeyboard'
import { useIdle } from '@/composables/useIdle'
import { useWakeLock } from '@/composables/useWakeLock'
import { focusHeading } from '@/composables/useHeadingFocus'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'

const training = useTrainingStore()
const profile = useProfileStore()
const settings = useSettingsStore()
const router = useRouter()

useWakeLock()

// Optionale Tasten für die Begleitperson
useKeyboard(
  { h: () => training.hint(), s: () => training.skip(), p: () => training.pause() },
  () => training.assisted && training.stage === 'task',
)
const showBar = computed(() => training.assisted && training.stage === 'task')
const { idle, reset: resetIdle } = useIdle()

// Nachfrage nur, wenn gerade trainiert wird – nicht in Pause oder am Ende
const idleOpen = computed(() => idle.value && (training.stage === 'task' || training.stage === 'break'))
watch(() => training.stage, () => resetIdle())
// Screenreader: neue Aufgabe bzw. neuer Abschnitt → Überschrift vorlesen
watch(() => [training.stage, training.task, training.phase === 'memorize'], () => void focusHeading())

function idleContinue() { resetIdle() }
function idlePause() { resetIdle(); training.pause() }

async function done() {
  training.reset()
  await router.push('/')
}
</script>

<template>
  <main class="training" :class="{ 'with-bar': showBar }">
    <div class="content">
    <MessageScreen
      v-if="training.stage === 'greeting'"
      :title="`Schön, dass Sie da sind, ${profile.current?.name}.`"
      :text="`Heute üben wir etwa ${settings.values.sessionMinutes} Minuten.`"
    >
      <BigButton label="Anfangen" :icon="Play" variant="primary" size="large" data-testid="begin" @press="training.begin()" />
    </MessageScreen>

    <TaskScreen v-else-if="training.stage === 'task' && training.task" />

    <MessageScreen v-else-if="training.stage === 'break'" title="Gut gemacht!" text="Möchten Sie weitermachen?">
      <BigButton label="Weiter" :icon="ChevronRight" variant="primary" size="large" data-testid="continue" @press="training.proceed()" />
      <BigButton label="Pause machen" :icon="Coffee" size="large" data-testid="break-pause" @press="training.pause()" />
    </MessageScreen>

    <MessageScreen v-else-if="training.stage === 'paused'" title="Pause" text="Machen Sie in Ruhe eine Pause. Es geht weiter, wann Sie möchten.">
      <BigButton label="Weiter" :icon="Play" variant="primary" size="large" data-testid="resume" @press="training.resume()" />
      <BigButton label="Für heute aufhören" :icon="House" size="large" data-testid="stop" @press="training.finish()" />
    </MessageScreen>

    <MessageScreen
      v-else-if="training.stage === 'end'"
      :title="`Sie haben heute ${training.minutesTrained} ${training.minutesTrained === 1 ? 'Minute' : 'Minuten'} trainiert.`"
      text="Bis zum nächsten Mal!"
    >
      <BigButton label="Fertig" :icon="Check" variant="primary" size="large" data-testid="done" @press="done" />
    </MessageScreen>

    </div>
    <CompanionBar v-if="showBar" />

    <DialogRoot :open="idleOpen">
      <DialogPortal>
        <DialogOverlay class="idle-overlay" />
        <DialogContent class="idle-dialog" data-testid="idle" @escape-key-down.prevent @pointer-down-outside.prevent @interact-outside.prevent>
          <DialogTitle class="idle-title">Möchten Sie weitermachen?</DialogTitle>
          <DialogDescription class="sr-only">Es gibt keine Zeitbegrenzung.</DialogDescription>
          <div class="idle-actions">
            <BigButton label="Ja, weiter" :icon="Play" variant="primary" size="large" @press="idleContinue" />
            <BigButton label="Pause" :icon="Pause" size="large" @press="idlePause" />
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </main>
</template>

<style scoped>
.training { height: 100%; display: grid; grid-template-rows: minmax(0, 1fr); overflow: hidden !important; }
.training.with-bar { grid-template-rows: minmax(0, 1fr) auto; }
.content { min-height: 0; overflow-y: auto; }
</style>

<style>
.idle-overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); }
.idle-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: var(--space-6);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.idle-title { margin: 0; font-size: var(--text-task); }
.idle-actions { display: flex; gap: var(--space-3); }
</style>
