<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { HandHelping, Play, Settings2 } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import ProfileTile from '@/components/profile/ProfileTile.vue'
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

async function go() {
  if (selectedId.value == null || starting.value) return
  starting.value = true
  await training.start(selectedId.value, assisted.value ? 'assisted' : 'alone')
  await router.push('/training')
}
</script>

<template>
  <main class="start">
    <header class="head">
      <h1>Guten Tag! Wer trainiert heute?</h1>
      <!-- für Begleitpersonen; bewusst unauffällig -->
      <RouterLink to="/verwaltung" class="admin-link" data-testid="to-admin">
        <Settings2 :size="22" aria-hidden="true" /><span>Verwaltung</span>
      </RouterLink>
    </header>

    <div class="tiles">
      <ProfileTile
        v-for="p in tiles"
        :key="p.id"
        :name="p.name"
        :symbol="p.icon"
        :selected="selectedId === p.id"
        @press="selectedId = p.id!"
      />
    </div>
    <p v-if="tiles.length === 0" class="no-profiles" data-testid="no-profiles">
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

      <BigButton
        label="Los geht’s"
        :icon="Play"
        variant="primary"
        size="large"
        :disabled="selectedId == null || starting"
        @press="go"
      />
    </div>

  </main>
</template>

<style scoped>
.start {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--space-5);
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin-inline: auto;
}
h1 { margin: 0; font-size: var(--text-task); text-align: left; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.admin-link {
  display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 var(--space-2);
  border: 2px solid var(--color-line); border-radius: 999px; color: var(--color-text-muted);
  font-size: var(--text-min); text-decoration: none; flex: none;
}
.admin-link:hover { border-color: var(--color-control-border); color: var(--color-text); }
.no-profiles { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); grid-row: 2; align-self: center; }
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  grid-auto-rows: minmax(180px, 260px);
  gap: var(--space-3);
  align-content: center;
  min-height: 0;
}
.bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
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
