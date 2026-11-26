<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay,
  AlertDialogPortal, AlertDialogRoot, AlertDialogTitle,
} from 'reka-ui'
import { Pencil, Trash2, UserPlus } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { PROFILE_ICONS } from '@/components/icons'
import ProfileEditor from '@/components/profile/ProfileEditor.vue'
import { db, type Profile } from '@/db/database'
import { useProfileStore, type ProfileSymbol } from '@/stores/profile'

const MAX_PROFILES = 6
const profile = useProfileStore()
const editorOpen = ref(false)
const editing = ref<Profile | null>(null)
const deleting = ref<Profile | null>(null)

function add() { editing.value = null; editorOpen.value = true }
function edit(p: Profile) { editing.value = p; editorOpen.value = true }

async function save(name: string, symbol: ProfileSymbol) {
  if (editing.value) {
    await db.profiles.update(editing.value.id!, { name, icon: symbol, color: symbol })
    await profile.load()
  } else {
    await profile.create(name, symbol)
  }
}

// Ziel sofort sichern: der Dialog setzt beim Schließen deleting zurück, ggf. vor diesem Handler
let pending: Profile | null = null
function closeDelete() { pending = deleting.value ?? pending; deleting.value = null }
async function confirmDelete() {
  const target = deleting.value ?? pending
  pending = null
  if (target) await profile.remove(target.id!)
  deleting.value = null
}
</script>

<template>
  <section class="tab">
    <p class="intro">Bis zu {{ MAX_PROFILES }} Profile pro PC. Bitte nur Rufnamen verwenden, keine Nachnamen.</p>

    <ul class="list">
      <li v-for="p in profile.profiles" :key="p.id" class="row" data-testid="profile-row">
        <span class="icon" :style="{ color: `var(--profile-${p.icon})` }">
          <component :is="PROFILE_ICONS[p.icon]" :size="40" aria-hidden="true" />
        </span>
        <span class="name">{{ p.name }}</span>
        <BigButton label="Bearbeiten" :icon="Pencil" @press="edit(p)" />
        <BigButton label="Löschen" :icon="Trash2" @press="deleting = p" />
      </li>
      <li v-if="profile.profiles.length === 0" class="empty">Noch keine Profile angelegt.</li>
    </ul>

    <BigButton v-if="profile.profiles.length < MAX_PROFILES" label="Neues Profil" :icon="UserPlus" variant="primary" data-testid="add-profile" @press="add" />

    <ProfileEditor
      v-model:open="editorOpen"
      :used-symbols="profile.profiles.filter((p) => p.id !== editing?.id).map((p) => p.icon)"
      :initial="editing ? { name: editing.name, symbol: editing.icon as ProfileSymbol } : undefined"
      @save="save"
    />

    <AlertDialogRoot :open="!!deleting" @update:open="(o) => { if (!o) closeDelete() }">
      <AlertDialogPortal>
        <AlertDialogOverlay class="dlg-overlay" />
        <AlertDialogContent class="dlg">
          <AlertDialogTitle class="dlg-title">Profil „{{ deleting?.name }}“ löschen?</AlertDialogTitle>
          <AlertDialogDescription class="dlg-text">Dabei werden auch alle Niveaus und der Verlauf dieses Profils gelöscht. Das lässt sich nicht rückgängig machen.</AlertDialogDescription>
          <div class="dlg-actions">
            <AlertDialogCancel class="dlg-btn">Abbrechen</AlertDialogCancel>
            <AlertDialogAction class="dlg-btn primary" data-testid="confirm-delete" @click.capture="confirmDelete">Endgültig löschen</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; }
.intro { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); width: 100%; }
.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 2px solid var(--color-line);
}
.icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--color-bg); }
.name { flex: 1; font-size: var(--text-answer); font-weight: 700; }
.empty { font-size: var(--text-help); color: var(--color-text-muted); }
</style>
