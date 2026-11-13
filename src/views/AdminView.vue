<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { BookOpen, ChartColumn, LogOut, Printer, Settings2, Users } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import PinPad from '@/components/admin/PinPad.vue'
import ProfilesTab from '@/components/admin/ProfilesTab.vue'
import ContentTab from '@/components/admin/ContentTab.vue'
import HistoryTab from '@/components/admin/HistoryTab.vue'
import SettingsTab from '@/components/admin/SettingsTab.vue'
import PrintTab from '@/components/admin/PrintTab.vue'
import { useAdminStore } from '@/stores/admin'

/** Verwaltung hinter PIN: Profile, Inhalte, Verlauf, Einstellungen. Hier darf gescrollt werden. */
const admin = useAdminStore()
const route = useRoute()
const router = useRouter()

const tabs = [
  { value: 'profile', label: 'Profile', icon: Users },
  { value: 'inhalte', label: 'Inhalte', icon: BookOpen },
  { value: 'verlauf', label: 'Verlauf', icon: ChartColumn },
  { value: 'drucken', label: 'Drucken', icon: Printer },
  { value: 'einstellungen', label: 'Einstellungen', icon: Settings2 },
]
const tab = ref(typeof route.query.tab === 'string' && tabs.some((t) => t.value === route.query.tab) ? route.query.tab : 'profile')

// PIN anlegen (zweimal) oder eingeben
const step = ref<'enter' | 'create' | 'repeat'>('enter')
const firstPin = ref('')
const error = ref('')

onMounted(async () => {
  await admin.refresh()
  step.value = admin.pinSet ? 'enter' : 'create'
})

async function onPin(pin: string) {
  if (step.value === 'enter') {
    error.value = (await admin.unlock(pin)) ? '' : 'Die PIN stimmt nicht. Bitte noch einmal versuchen.'
  } else if (step.value === 'create') {
    firstPin.value = pin; step.value = 'repeat'; error.value = ''
  } else if (pin === firstPin.value) {
    await admin.createPin(pin)
  } else {
    step.value = 'create'; error.value = 'Die beiden PINs stimmen nicht überein. Bitte noch einmal.'
  }
}

async function leave() {
  admin.lock()
  await router.push('/')
}

const onActivity = () => admin.touch()
onMounted(() => window.addEventListener('pointerdown', onActivity))
onBeforeUnmount(() => { window.removeEventListener('pointerdown', onActivity); admin.lock() })
</script>

<template>
  <main class="admin">
    <template v-if="!admin.unlocked">
      <div class="gate">
        <PinPad
          :title="step === 'enter' ? 'Verwaltung' : step === 'create' ? 'PIN festlegen' : 'PIN wiederholen'"
          :text="step === 'enter' ? 'Bitte geben Sie die PIN ein.' : 'Legen Sie eine 4-stellige PIN für die Verwaltung fest. Nur Begleitpersonen sollten sie kennen.'"
          :error="error"
          @complete="onPin"
        />
        <BigButton label="Zurück" :icon="LogOut" @press="leave" />
      </div>
    </template>

    <TabsRoot v-else v-model="tab" class="tabs">
      <header class="head">
        <TabsList class="list" aria-label="Bereiche der Verwaltung">
          <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value" class="trigger" :data-testid="`tab-${t.value}`">
            <component :is="t.icon" :size="24" aria-hidden="true" />{{ t.label }}
          </TabsTrigger>
        </TabsList>
        <BigButton label="Verwaltung verlassen" :icon="LogOut" data-testid="leave-admin" @press="leave" />
      </header>
      <div class="scroll">
        <TabsContent value="profile"><ProfilesTab /></TabsContent>
        <TabsContent value="inhalte"><ContentTab /></TabsContent>
        <TabsContent value="verlauf"><HistoryTab /></TabsContent>
        <TabsContent value="drucken"><PrintTab /></TabsContent>
        <TabsContent value="einstellungen"><SettingsTab /></TabsContent>
      </div>
    </TabsRoot>
  </main>
</template>

<style scoped>
.admin { height: 100%; }
.gate { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); overflow-y: auto; }
.tabs { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); }
.head {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); border-bottom: 2px solid var(--color-line); background: var(--color-surface);
}
.list { display: flex; gap: var(--space-1); }
.trigger {
  display: inline-flex; align-items: center; gap: var(--space-1); min-height: 56px; padding: 0 var(--space-2);
  border: 2px solid transparent; border-radius: 12px; background: transparent; color: var(--color-text);
  font-size: var(--text-help); cursor: pointer;
}
.trigger :deep(svg) { color: var(--color-accent-text); }
.trigger[data-state='active'] { background: var(--color-accent-soft); border-color: var(--color-accent); font-weight: 700; }
.scroll { overflow-y: auto; padding: var(--space-3) var(--space-4) var(--space-6); }
</style>
