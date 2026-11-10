<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Download, KeyRound, RefreshCw, Upload } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { db } from '@/db/database'
import {
  backupDue, backupFileName, exportAll, exportContent, importBackup, ImportError, markExported, parseBackup,
  type BackupFile,
} from '@/db/backup'
import { openTextFile, saveTextFile } from '@/lib/files'
import { setPin } from '@/lib/pin'
import { usePwaUpdate } from '@/composables/usePwaUpdate'
import { useContentStore } from '@/stores/content'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore, type Settings } from '@/stores/settings'
import PinPad from './PinPad.vue'

const settings = useSettingsStore()
const profile = useProfileStore()
const content = useContentStore()
const { needRefresh, apply } = usePwaUpdate()

const message = ref('')
const due = ref(false)
const pendingImport = ref<BackupFile | null>(null)
const changingPin = ref<'off' | 'first' | 'second'>('off')
const firstPin = ref('')
const pinError = ref('')

onMounted(async () => { due.value = await backupDue(db) })

const minutes = [10, 15, 20, 30]
const scales: { value: Settings['fontScale']; label: string }[] = [
  { value: 1, label: 'Normal' }, { value: 1.15, label: 'Groß' }, { value: 1.3, label: 'Größer' }, { value: 1.5, label: 'Am größten' },
]

async function doExport(kind: 'inhalte' | 'sicherung') {
  const file = kind === 'inhalte' ? await exportContent(db) : await exportAll(db)
  if (await saveTextFile(backupFileName(kind), JSON.stringify(file, null, 2))) {
    if (kind === 'sicherung') { await markExported(db); due.value = false }
    message.value = kind === 'inhalte' ? `${file.items.length} eigene Einträge exportiert.` : 'Sicherung gespeichert.'
  }
}

async function doImport() {
  message.value = ''
  const text = await openTextFile()
  if (text == null) return
  try {
    const file = parseBackup(text)
    if (file.kind === 'sicherung') { pendingImport.value = file; return }
    await finishImport(file, false)
  } catch (e) {
    message.value = e instanceof ImportError ? e.message : 'Die Datei konnte nicht gelesen werden.'
  }
}

async function finishImport(file: BackupFile, replacePeople: boolean) {
  const r = await importBackup(db, file, { replacePeople })
  pendingImport.value = null
  if (replacePeople) await profile.load()
  await content.load()
  message.value = `${r.added} Einträge hinzugefügt` + (r.skipped ? `, ${r.skipped} schon vorhanden` : '') + (r.invalid ? `, ${r.invalid} ungültig übersprungen` : '') + (replacePeople ? '; Profile und Verlauf wiederhergestellt.' : '.')
}

async function onPin(pin: string) {
  if (changingPin.value === 'first') { firstPin.value = pin; changingPin.value = 'second'; pinError.value = ''; return }
  if (pin !== firstPin.value) { changingPin.value = 'first'; pinError.value = 'Die beiden PINs stimmen nicht überein. Bitte noch einmal.'; return }
  await setPin(db, pin)
  changingPin.value = 'off'
  message.value = 'Die PIN wurde geändert.'
}
</script>

<template>
  <section class="tab">
    <p v-if="message" class="message" role="status" data-testid="settings-message">{{ message }}</p>

    <div v-if="needRefresh" class="box">
      <h2>Neue Version verfügbar</h2>
      <p>Bitte nur aktualisieren, wenn gerade niemand trainiert.</p>
      <BigButton label="Jetzt aktualisieren" :icon="RefreshCw" variant="primary" @press="apply" />
    </div>

    <div class="box">
      <h2>Training</h2>
      <fieldset class="choices">
        <legend>Länge einer Einheit</legend>
        <label v-for="m in minutes" :key="m" class="choice" :class="{ on: settings.values.sessionMinutes === m }">
          <input type="radio" name="minutes" :checked="settings.values.sessionMinutes === m" :data-testid="`minutes-${m}`" @change="settings.set('sessionMinutes', m)" /> {{ m }} Minuten
        </label>
      </fieldset>
      <fieldset class="choices">
        <legend>Ton bei richtiger Antwort</legend>
        <label class="choice" :class="{ on: settings.values.sound }"><input type="radio" name="sound" :checked="settings.values.sound" @change="settings.set('sound', true)" /> An (sanft)</label>
        <label class="choice" :class="{ on: !settings.values.sound }"><input type="radio" name="sound" :checked="!settings.values.sound" @change="settings.set('sound', false)" /> Aus</label>
      </fieldset>
    </div>

    <div class="box">
      <h2>Darstellung</h2>
      <fieldset class="choices">
        <legend>Schriftgröße</legend>
        <label v-for="s in scales" :key="s.value" class="choice" :class="{ on: settings.values.fontScale === s.value }">
          <input type="radio" name="scale" :checked="settings.values.fontScale === s.value" @change="settings.set('fontScale', s.value)" /> {{ s.label }}
        </label>
      </fieldset>
      <fieldset class="choices">
        <legend>Farben</legend>
        <label class="choice" :class="{ on: settings.values.theme === 'light' }"><input type="radio" name="theme" :checked="settings.values.theme === 'light'" @change="settings.set('theme', 'light')" /> Hell</label>
        <label class="choice" :class="{ on: settings.values.theme === 'dark' }"><input type="radio" name="theme" :checked="settings.values.theme === 'dark'" data-testid="theme-dark" @change="settings.set('theme', 'dark')" /> Dunkel</label>
      </fieldset>
    </div>

    <div class="box">
      <h2>Datensicherung und Austausch</h2>
      <p v-if="due" class="due" data-testid="backup-due">Die letzte Sicherung ist länger als 30 Tage her (oder es gab noch keine). Bitte sichern Sie die Daten, z. B. auf einen USB-Stick.</p>
      <p>Die <strong>Sicherung</strong> enthält Profile, Verlauf und eigene Inhalte dieses PCs. <strong>Inhalte teilen</strong> exportiert nur eigene Inhalte, ohne Personendaten – zum Weitergeben an andere Einrichtungen.</p>
      <div class="row">
        <BigButton label="Sicherung speichern" :icon="Download" variant="primary" data-testid="export-all" @press="doExport('sicherung')" />
        <BigButton label="Inhalte teilen" :icon="Download" data-testid="export-content" @press="doExport('inhalte')" />
        <BigButton label="Datei einlesen" :icon="Upload" data-testid="import" @press="doImport" />
      </div>
      <div v-if="pendingImport" class="confirm" role="alertdialog" aria-label="Sicherung einlesen">
        <p><strong>Diese Datei ist eine vollständige Sicherung.</strong> Sollen Profile und Verlauf auf diesem PC dadurch ersetzt werden? Eigene Inhalte werden in jedem Fall nur ergänzt.</p>
        <div class="row">
          <BigButton label="Nur Inhalte übernehmen" @press="finishImport(pendingImport!, false)" />
          <BigButton label="Profile und Verlauf ersetzen" variant="primary" data-testid="import-replace" @press="finishImport(pendingImport!, true)" />
        </div>
      </div>
    </div>

    <div class="box">
      <h2>PIN</h2>
      <BigButton v-if="changingPin === 'off'" label="PIN ändern" :icon="KeyRound" @press="changingPin = 'first'; pinError = ''" />
      <PinPad
        v-else
        :title="changingPin === 'first' ? 'Neue PIN eingeben' : 'Neue PIN wiederholen'"
        :error="pinError"
        @complete="onPin"
      />
    </div>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-3); }
.box { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius); background: var(--color-surface); font-size: var(--text-min); }
.box p { margin: 0; max-width: 70ch; }
h2 { margin: 0; font-size: var(--text-help); }
.choices { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); align-items: center; }
.choices legend { font-weight: 700; margin-bottom: var(--space-1); }
.choice {
  display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 var(--space-2);
  border: 2px solid var(--color-control-border); border-radius: 12px; cursor: pointer;
}
.choice.on { border-color: var(--color-accent); border-width: 4px; background: var(--color-accent-soft); font-weight: 700; }
.choice input { width: 22px; height: 22px; accent-color: var(--color-accent); }
.choice:has(input:focus-visible) { box-shadow: var(--focus-shadow); }
.row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.message, .due { padding: var(--space-2); border-radius: 12px; background: var(--color-accent-soft); font-size: var(--text-min); font-weight: 700; margin: 0; }
.confirm { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); border: 3px solid var(--color-accent); border-radius: 12px; }
</style>
