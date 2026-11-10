<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay,
  AlertDialogPortal, AlertDialogRoot, AlertDialogTitle, SwitchRoot, SwitchThumb,
} from 'reka-ui'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { iconByName } from '@/components/icons'
import { db, type ExerciseId, type ItemRow } from '@/db/database'
import { CONTENT_FIELDS, itemSummary } from '@/exercises/schemas'
import { registry } from '@/exercises/registry'
import { useContentStore } from '@/stores/content'
import ItemEditor from './ItemEditor.vue'

/** Inhalte je Übung: Standardinhalte an-/ausschalten, eigene anlegen, bearbeiten, löschen. */
const content = useContentStore()
const editable = Object.keys(CONTENT_FIELDS) as ExerciseId[]
const exercise = ref<ExerciseId>(editable[0]!)
const filter = ref<'all' | 'user'>('all')
const editorOpen = ref(false)
const editing = ref<ItemRow | null>(null)
const deleting = ref<ItemRow | null>(null)

const rows = computed(() => content.items
  .filter((i) => i.exercise === exercise.value && (filter.value === 'all' || i.source === 'user'))
  .sort((a, b) => (a.source === b.source ? a.minLevel - b.minLevel : a.source === 'user' ? -1 : 1)))

const activeCount = computed(() => content.items.filter((i) => i.exercise === exercise.value && i.enabled).length)

function add() { editing.value = null; editorOpen.value = true }
function edit(i: ItemRow) { editing.value = i; editorOpen.value = true }

async function save(payload: Record<string, unknown>, minLevel: number, maxLevel: number) {
  const range = { minLevel: minLevel as ItemRow['minLevel'], maxLevel: maxLevel as ItemRow['maxLevel'] }
  if (editing.value) await content.updateItem(editing.value.id!, { payload, ...range })
  else await content.addItem({ exercise: exercise.value, payload, ...range, enabled: 1 })
}

let pending: ItemRow | null = null
function closeDelete() { pending = deleting.value ?? pending; deleting.value = null }
async function confirmDelete() {
  const target = deleting.value ?? pending
  pending = null
  if (target?.source === 'user') await db.items.delete(target.id!)
  deleting.value = null
}
</script>

<template>
  <section class="tab">
    <div class="exercises" role="radiogroup" aria-label="Übung">
      <button
        v-for="ex in editable" :key="ex" type="button" role="radio" class="chip"
        :aria-checked="exercise === ex" :class="{ on: exercise === ex }" :data-testid="`ex-${ex}`" @click="exercise = ex"
      >
        <component :is="iconByName(registry[ex].icon)" :size="24" aria-hidden="true" />{{ registry[ex].label }}
      </button>
    </div>

    <div class="toolbar">
      <label class="filter"><input v-model="filter" type="radio" value="all" /> Alle</label>
      <label class="filter"><input v-model="filter" type="radio" value="user" /> Nur eigene</label>
      <span class="count">{{ activeCount }} aktiv</span>
      <BigButton label="Neuer Eintrag" :icon="Plus" variant="primary" data-testid="add-item" @press="add" />
    </div>
    <p class="muted">„Farben lesen“ und „Rechnen“ werden automatisch erzeugt und brauchen keine Inhalte.</p>

    <ul class="list" data-testid="item-list">
      <li v-for="i in rows" :key="i.id" class="row" :class="{ off: !i.enabled }">
        <SwitchRoot
          :model-value="i.enabled === 1" class="switch" :aria-label="`${itemSummary(i.exercise, i.payload as Record<string, unknown>)} verwenden`"
          @update:model-value="(v: boolean) => content.setEnabled(i.id!, v)"
        ><SwitchThumb class="thumb" /></SwitchRoot>
        <span class="summary">{{ itemSummary(i.exercise, i.payload as Record<string, unknown>) }}</span>
        <span class="lvl">Niveau {{ i.minLevel }}–{{ i.maxLevel }}</span>
        <span class="src" :class="i.source">{{ i.source === 'user' ? 'eigener' : 'Standard' }}</span>
        <template v-if="i.source === 'user'">
          <button type="button" class="icon-btn" :aria-label="`Bearbeiten`" @click="edit(i)"><Pencil :size="22" aria-hidden="true" /><span>Bearbeiten</span></button>
          <button type="button" class="icon-btn" :aria-label="`Löschen`" @click="deleting = i"><Trash2 :size="22" aria-hidden="true" /><span>Löschen</span></button>
        </template>
      </li>
    </ul>

    <ItemEditor v-model:open="editorOpen" :exercise="exercise" :item="editing" @save="save" />

    <AlertDialogRoot :open="!!deleting" @update:open="(o) => { if (!o) closeDelete() }">
      <AlertDialogPortal>
        <AlertDialogOverlay class="dlg-overlay" />
        <AlertDialogContent class="dlg">
          <AlertDialogTitle class="dlg-title">Eintrag löschen?</AlertDialogTitle>
          <AlertDialogDescription class="dlg-text">{{ deleting && itemSummary(deleting.exercise, deleting.payload as Record<string, unknown>) }}</AlertDialogDescription>
          <div class="dlg-actions">
            <AlertDialogCancel class="dlg-btn">Abbrechen</AlertDialogCancel>
            <AlertDialogAction class="dlg-btn primary" @click.capture="confirmDelete">Löschen</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-2); }
.exercises { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.chip {
  display: inline-flex; align-items: center; gap: 6px; min-height: 52px; padding: 0 var(--space-2);
  border: 2px solid var(--color-control-border); border-radius: 999px; background: var(--color-surface);
  color: var(--color-text); font-size: var(--text-min); cursor: pointer;
}
.chip :deep(svg) { color: var(--color-accent-text); }
.chip.on { border-color: var(--color-accent); border-width: 4px; background: var(--color-accent-soft); font-weight: 700; }
.toolbar { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-min); }
.filter { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.filter input { width: 22px; height: 22px; }
.count { margin-left: auto; color: var(--color-text-muted); }
.muted { margin: 0; color: var(--color-text-muted); font-size: var(--text-min); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.row {
  display: grid; grid-template-columns: auto 1fr auto auto auto auto; align-items: center; gap: var(--space-2);
  padding: 6px var(--space-2); border-radius: 12px; background: var(--color-surface); font-size: var(--text-min);
}
.row.off .summary { color: var(--color-text-muted); }
.lvl { font-variant-numeric: tabular-nums; color: var(--color-text-muted); }
.src { padding: 2px 10px; border-radius: 999px; border: 2px solid var(--color-line); }
.src.user { border-color: var(--color-accent); color: var(--color-accent-text); font-weight: 700; }
.icon-btn {
  display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 10px;
  border: 2px solid var(--color-control-border); border-radius: 10px; background: var(--color-surface);
  color: var(--color-text); font-size: var(--text-min); cursor: pointer;
}
.icon-btn :deep(svg) { color: var(--color-accent-text); }
.switch {
  position: relative; width: 64px; height: 36px; flex: none; border-radius: 999px;
  border: 3px solid var(--color-control-border); background: var(--color-neutral-bg); cursor: pointer;
}
.switch[data-state='checked'] { background: var(--color-accent); border-color: var(--color-accent); }
.thumb {
  display: block; width: 26px; height: 26px; border-radius: 50%; background: var(--color-surface);
  border: 2px solid var(--color-control-border); transform: translateX(2px); transition: transform 150ms;
}
.thumb[data-state='checked'] { transform: translateX(29px); }
</style>
