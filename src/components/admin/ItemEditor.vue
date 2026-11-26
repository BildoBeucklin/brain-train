<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Check, X } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import type { ExerciseId, ItemRow } from '@/db/database'
import { CONTENT_FIELDS, validateItem } from '@/exercises/schemas'
import { registry } from '@/exercises/registry'

/** Eintrag anlegen oder bearbeiten; Prüfung mit zod (src/exercises/schemas.ts). */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ exercise: ExerciseId; item?: ItemRow | null }>()
const emit = defineEmits<{ save: [payload: Record<string, unknown>, minLevel: number, maxLevel: number] }>()

const fields = computed(() => CONTENT_FIELDS[props.exercise] ?? [])
const form = reactive<Record<string, string | string[]>>({})
const minLevel = ref(1)
const maxLevel = ref(3)
const errors = ref<Record<string, string>>({})

watch(open, (o) => {
  if (!o) return
  errors.value = {}
  const p = (props.item?.payload ?? {}) as Record<string, unknown>
  for (const f of fields.value) {
    form[f.key] = f.type === 'list'
      ? Array.from({ length: Math.max(f.count, ((p[f.key] as string[]) ?? []).length) }, (_, i) => ((p[f.key] as string[]) ?? [])[i] ?? '')
      : String(p[f.key] ?? '')
  }
  minLevel.value = props.item?.minLevel ?? 1
  maxLevel.value = props.item?.maxLevel ?? (props.exercise === 'memory' ? 10 : 3)
})

function save() {
  const payload: Record<string, unknown> = { ...((props.item?.payload as object) ?? {}) }
  for (const f of fields.value) payload[f.key] = form[f.key]
  const r = validateItem(props.exercise, payload, minLevel.value, maxLevel.value)
  if (!r.ok) { errors.value = r.errors; return }
  emit('save', r.payload, minLevel.value, maxLevel.value)
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="dialog" data-testid="item-editor">
        <DialogTitle class="title">{{ item ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }} – {{ registry[exercise].label }}</DialogTitle>
        <DialogDescription class="desc">Bitte keine Namen von Bewohnerinnen und Bewohnern eintragen.</DialogDescription>

        <div class="body">
          <div class="levels">
            <label>Ab Niveau
              <select v-model.number="minLevel" data-testid="min-level"><option v-for="n in 10" :key="n" :value="n">{{ n }}</option></select>
            </label>
            <label>bis Niveau
              <select v-model.number="maxLevel" data-testid="max-level"><option v-for="n in 10" :key="n" :value="n">{{ n }}</option></select>
            </label>
            <p v-if="errors.maxLevel" class="err">{{ errors.maxLevel }}</p>
          </div>

          <div v-for="f in fields" :key="f.key" class="field">
            <template v-if="f.type === 'text'">
              <label :for="`f-${f.key}`">{{ f.label }}</label>
              <input :id="`f-${f.key}`" v-model="form[f.key] as string" :data-testid="`f-${f.key}`" :aria-invalid="!!errors[f.key]" />
            </template>
            <fieldset v-else>
              <legend>{{ f.label }}</legend>
              <input
                v-for="(_, i) in form[f.key] as string[]" :key="i" v-model="(form[f.key] as string[])[i]"
                :aria-label="`${f.label} ${i + 1}`" :data-testid="`f-${f.key}-${i}`" :aria-invalid="!!errors[f.key]"
              />
            </fieldset>
            <p v-if="f.help" class="help">{{ f.help }}</p>
            <p v-if="errors[f.key]" class="err" role="alert">{{ errors[f.key] }}</p>
          </div>
        </div>

        <div class="actions">
          <BigButton label="Abbrechen" :icon="X" @press="open = false" />
          <BigButton label="Speichern" :icon="Check" variant="primary" data-testid="item-save" @press="save" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); }
.dialog {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(860px, calc(100% - 2 * var(--space-4))); max-height: calc(100% - 2 * var(--space-3)); overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--space-2);
  padding: var(--space-4); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text);
}
.title { margin: 0; font-size: var(--text-answer); }
.desc { margin: 0; font-size: var(--text-min); color: var(--color-text-muted); }
.body { overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-2); padding: 4px; }
.levels { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; font-size: var(--text-min); font-weight: 700; }
.levels label { display: inline-flex; align-items: center; gap: var(--space-1); }
.field { display: flex; flex-direction: column; gap: 4px; font-size: var(--text-min); }
.field label, legend { font-weight: 700; }
fieldset { border: 0; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-1); }
fieldset legend { margin-bottom: 4px; }
input, select {
  font: inherit; font-size: var(--text-min); min-height: 48px; padding: 0 var(--space-1);
  border: 2px solid var(--color-control-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text);
}
input[aria-invalid='true'] { border-width: 3px; border-style: dashed; }
input:focus-visible, select:focus-visible { outline: none; box-shadow: var(--focus-shadow); }
.help { margin: 0; color: var(--color-text-muted); }
.err { margin: 0; font-weight: 700; }
.actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
</style>
