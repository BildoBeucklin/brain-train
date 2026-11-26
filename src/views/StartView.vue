<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { ArrowLeft, Dices, HandHelping, LayoutGrid, Play, Settings2 } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import ProfileTile from '@/components/profile/ProfileTile.vue'
import WindowControls from '@/components/WindowControls.vue'
import DisplayControls from '@/components/DisplayControls.vue'
import { iconByName } from '@/components/icons'
import type { ExerciseId } from '@/db/database'
import { EXERCISE_IDS, registry } from '@/exercises/registry'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'

const MAX_TILES = 6

const profile = useProfileStore()
const settings = useSettingsStore()
const training = useTrainingStore()
const router = useRouter()

const selectedId = ref<number | null>(profile.profiles.length === 1 ? profile.profiles[0]!.id! : null)
const assisted = ref(settings.values.mode === 'assisted')
const starting = ref(false)

// Neue Profile (noch keine Einheit) starten standardmäßig mit Begleitung
watch(selectedId, async (id) => {
  if (id != null && !(await profile.hasSessions(id))) assisted.value = true
}, { immediate: true })

const tiles = computed(() => profile.profiles.slice(0, MAX_TILES))

/** 'profiles': Profil wählen; 'exercises': eine bestimmte Übung wählen. */
const view = ref<'profiles' | 'exercises'>('profiles')

/** Ohne Angabe: tägliches Training mit allen Übungen im Wechsel. */
async function go(exercise?: ExerciseId) {
  if (selectedId.value == null || starting.value) return
  starting.value = true
  await training.start(selectedId.value, assisted.value ? 'assisted' : 'alone', exercise ? [exercise] : undefined)
  await router.push('/training')
}
</script>

<template>
  <main class="start">
    <header class="head">
      <h1 v-if="view === 'profiles'">Guten Tag! Wer trainiert heute?</h1>
      <h1 v-else>Welche Übung möchten Sie machen?</h1>
      <!-- für Begleitpersonen; bewusst unauffällig -->
      <div class="head-right">
        <DisplayControls />
        <RouterLink to="/verwaltung" class="admin-link" data-testid="to-admin">
          <Settings2 :size="22" aria-hidden="true" /><span>Verwaltung</span>
        </RouterLink>
        <WindowControls />
      </div>
    </header>

    <div v-if="view === 'exercises'" class="exercises" data-testid="exercise-picker">
      <button
        v-for="ex in EXERCISE_IDS"
        :key="ex"
        type="button"
        class="exercise"
        :disabled="starting"
        :data-testid="`pick-${ex}`"
        @click="go(ex)"
      >
        <component :is="iconByName(registry[ex].icon)" :size="48" aria-hidden="true" />
        <span>{{ registry[ex].label }}</span>
      </button>
    </div>

    <div v-else class="tiles">
      <ProfileTile
        v-for="p in tiles"
        :key="p.id"
        :name="p.name"
        :symbol="p.icon"
        :selected="selectedId === p.id"
        @press="selectedId = p.id!"
      />
    </div>
    <p v-if="view === 'profiles' && tiles.length === 0" class="no-profiles" data-testid="no-profiles">
      Es gibt noch kein Profil. Eine Begleitperson legt es unter „Verwaltung“ an.
    </p>

    <div class="bottom">
      <label class="toggle">
        <SwitchRoot v-model="assisted" class="switch">
          <SwitchThumb class="thumb" />
        </SwitchRoot>
        <HandHelping :size="32" aria-hidden="true" />
        <span>Mit Begleitung</span>
      </label>

      <div v-if="view === 'profiles'" class="choices">
        <BigButton label="Spiele (bald)" :icon="Dices" disabled data-testid="games" />
        <BigButton
          label="Übung auswählen"
          :icon="LayoutGrid"
          size="large"
          :disabled="selectedId == null || starting"
          data-testid="choose-exercise"
          @press="view = 'exercises'"
        />
        <BigButton
          label="Tägliches Training"
          :icon="Play"
          variant="primary"
          size="large"
          :disabled="selectedId == null || starting"
          data-testid="daily"
          @press="go()"
        />
      </div>
      <BigButton v-else label="Zurück" :icon="ArrowLeft" size="large" data-testid="back-to-profiles" @press="view = 'profiles'" />
    </div>

    <footer class="credits" data-testid="credits">
      Inspiriert von den Übungen von Univ.-Prof. Wolf-Dieter Oswald, dem Initiator der SIMA-Studien und des SimA®-Schulungsprogramms.
      In Kooperation mit dem Cohaus-Vendt-Stift, gefördert von der Sozialstiftung NRW.
      Entwickelt von RIS – Roßmann IT Solutions.
    </footer>
  </main>
</template>

<style scoped>
.start {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: var(--space-5);
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin-inline: auto;
}
h1 { margin: 0; font-size: var(--text-task); text-align: left; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
.head-right { display: flex; gap: var(--space-1); flex-wrap: wrap; justify-content: flex-end; }
.admin-link {
  display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 var(--space-2);
  border: 2px solid var(--color-line); border-radius: 999px; color: var(--color-text-muted);
  font-size: var(--text-min); text-decoration: none; flex: none;
}
.admin-link:hover { border-color: var(--color-control-border); color: var(--color-text); }
.no-profiles { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); grid-row: 2; align-self: center; }
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(max(220px, calc((100% - 2 * var(--space-3)) / 3)), 1fr));
  grid-auto-rows: minmax(180px, 260px);
  gap: var(--space-3);
  align-content: center;
  min-height: 0;
}
.choices { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end; }
.exercises {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-2);
  align-content: center;
  min-height: 0;
  overflow-y: auto;
}
.exercise {
  display: flex; align-items: center; gap: var(--space-2);
  min-height: 128px; min-width: 0; padding: var(--space-3);
  border: 3px solid var(--color-control-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text);
  font-size: var(--text-answer); font-weight: 700; text-align: left; cursor: pointer;
  line-height: 1.2; overflow-wrap: break-word; hyphens: auto;
}
.exercise:hover:not(:disabled) { background: var(--color-accent-soft); border-color: var(--color-accent); }
.exercise :deep(svg) { color: var(--color-accent-text); flex: none; }
.credits { margin-top: calc(-1 * var(--space-3)); font-size: var(--text-min); color: var(--color-text-muted); text-align: center; line-height: 1.4; }
.bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-help);
  font-weight: 700;
  cursor: pointer;
}
.switch {
  position: relative;
  width: 88px;
  height: 48px;
  flex: none;
  border-radius: 999px;
  border: 3px solid var(--color-control-border);
  background: var(--color-neutral-bg);
  cursor: pointer;
}
.switch[data-state='checked'] { background: var(--color-accent); border-color: var(--color-accent); }
.thumb {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-control-border);
  transform: translateX(3px);
  transition: transform 150ms;
}
.thumb[data-state='checked'] { transform: translateX(41px); }
</style>
