<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { HandHelping, Play } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import ProfileTile from '@/components/profile/ProfileTile.vue'
import ProfileEditor from '@/components/profile/ProfileEditor.vue'
import { useProfileStore, type ProfileSymbol } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'
import { useTrainingStore } from '@/stores/training'

const MAX_TILES = 6

const profile = useProfileStore()
const settings = useSettingsStore()
const training = useTrainingStore()
const router = useRouter()

const selectedId = ref<number | null>(profile.profiles.length === 1 ? profile.profiles[0]!.id! : null)
const assisted = ref(settings.values.mode === 'assisted')
const editorOpen = ref(false)
const starting = ref(false)

const tiles = computed(() => profile.profiles.slice(0, MAX_TILES))
const canAdd = computed(() => profile.profiles.length < MAX_TILES)

async function onSave(name: string, symbol: ProfileSymbol) {
  selectedId.value = await profile.create(name, symbol)
}

async function go() {
  if (selectedId.value == null || starting.value) return
  starting.value = true
  await training.start(selectedId.value, assisted.value ? 'assisted' : 'alone')
  await router.push('/training')
}
</script>

<template>
  <main class="start">
    <h1>Guten Tag! Wer trainiert heute?</h1>

    <div class="tiles">
      <ProfileTile
        v-for="p in tiles"
        :key="p.id"
        :name="p.name"
        :symbol="p.icon"
        :selected="selectedId === p.id"
        @press="selectedId = p.id!"
      />
      <ProfileTile v-if="canAdd" name="Neues Profil" @press="editorOpen = true" />
    </div>

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

    <ProfileEditor v-model:open="editorOpen" :used-symbols="profile.profiles.map((p) => p.icon)" @save="onSave" />
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
