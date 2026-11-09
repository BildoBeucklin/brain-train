<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { Check, X } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { PROFILE_ICONS } from '@/components/icons'
import { PROFILE_SYMBOLS, type ProfileSymbol } from '@/stores/profile'

/** Neues Profil: Rufname und Symbol (für die Begleitperson; die Verwaltung mit PIN folgt in Meilenstein 5). */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ usedSymbols: string[] }>()
const emit = defineEmits<{ save: [name: string, symbol: ProfileSymbol] }>()

const name = ref('')
const symbol = ref<ProfileSymbol | null>(null)
const valid = computed(() => name.value.trim().length > 0 && name.value.trim().length <= 20 && symbol.value)

watch(open, (o) => {
  if (!o) return
  name.value = ''
  symbol.value = PROFILE_SYMBOLS.find((s) => !props.usedSymbols.includes(s.id))?.id ?? null
})

function save() {
  if (!valid.value) return
  emit('save', name.value.trim(), symbol.value!)
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="dialog" @submit.prevent>
        <DialogTitle class="title">Neues Profil</DialogTitle>
        <DialogDescription class="desc">Bitte nur den Rufnamen eintragen, keinen Nachnamen.</DialogDescription>

        <label class="field">
          <span>Rufname</span>
          <input v-model="name" maxlength="20" autocomplete="off" @keydown.enter="save" />
        </label>

        <fieldset class="symbols">
          <legend>Symbol</legend>
          <label v-for="s in PROFILE_SYMBOLS" :key="s.id" class="symbol" :class="{ checked: symbol === s.id }">
            <input v-model="symbol" type="radio" name="symbol" :value="s.id" />
            <component :is="PROFILE_ICONS[s.id]" :size="48" :style="{ color: `var(--profile-${s.id})` }" aria-hidden="true" />
            <span>{{ s.label }}</span>
          </label>
        </fieldset>

        <div class="actions">
          <BigButton label="Abbrechen" :icon="X" @press="open = false" />
          <BigButton label="Speichern" :icon="Check" variant="primary" :disabled="!valid" @press="save" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
:deep(.overlay), .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); }
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(760px, calc(100vw - 2 * var(--space-4)));
  max-height: calc(100vh - 2 * var(--space-4));
  padding: var(--space-5);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.title { margin: 0; font-size: var(--text-task); }
.desc { margin: 0; font-size: var(--text-help); color: var(--color-text-muted); }
.field { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-help); font-weight: 700; }
.field input {
  font: inherit;
  font-weight: 400;
  font-size: var(--text-answer);
  padding: var(--space-2);
  border: 3px solid var(--color-control-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text);
}
.field input:focus-visible { box-shadow: var(--focus-shadow); outline: none; }
.symbols {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-2);
}
.symbols legend { font-size: var(--text-help); font-weight: 700; margin-bottom: var(--space-1); }
.symbol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-1);
  border: 3px solid var(--color-control-border);
  border-radius: 12px;
  font-size: var(--text-min);
  cursor: pointer;
}
.symbol.checked { border-color: var(--color-accent); border-width: 5px; background: var(--color-accent-soft); }
.symbol input { position: absolute; opacity: 0; pointer-events: none; }
.symbol:has(input:focus-visible) { box-shadow: var(--focus-shadow); }
.actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }
</style>
