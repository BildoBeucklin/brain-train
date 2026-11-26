<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Printer, RefreshCw } from 'lucide-vue-next'
import BigButton from '@/components/BigButton.vue'
import { iconByName } from '@/components/icons'
import type { ExerciseId, Level } from '@/db/database'
import { NoContentError } from '@/exercises/build'
import { LEVELS } from '@/exercises/levels'
import { prompts } from '@/exercises/prompts'
import { EXERCISE_IDS, registry } from '@/exercises/registry'
import { productImage } from '@/exercises/shopping/images'
import type { Task } from '@/exercises/types'
import { useContentStore } from '@/stores/content'

/** Arbeitsblatt zum Ausdrucken: Aufgaben ohne PC lösen, Lösungen auf der letzten Seite. */
const content = useContentStore()

// Merken braucht Einprägen und anschließendes Verdecken – auf Papier nicht sinnvoll.
const PRINTABLE = EXERCISE_IDS.filter((e) => e !== 'memory')
const chosen = ref<ExerciseId[]>([...PRINTABLE])
const level = ref<Level>(3)
const perExercise = ref(2)
const tasks = shallowRef<Task[]>([])
const skipped = ref<string[]>([])

function build() {
  const out: Task[] = []
  const missing: string[] = []
  for (const ex of PRINTABLE.filter((e) => chosen.value.includes(e))) {
    for (let i = 0; i < perExercise.value; i++) {
      try {
        out.push(registry[ex].generate({ level: level.value, random: Math.random, draw: content.draw, pool: content.pool }))
      } catch (e) {
        if (!(e instanceof NoContentError)) throw e
        missing.push(registry[ex].label)
        break
      }
    }
  }
  tasks.value = out
  skipped.value = missing
}

/** Vorlese-Aufgaben haben nur „Fertig gelesen“ – auf Papier keine Antwortkästchen. */
const readAloud = (t: Task) => t.options.length === 1
const answerOf = (t: Task) => readAloud(t)
  ? 'laut vorlesen – Zeit notieren'
  : t.options.filter((o) => t.correctIds.includes(o.id)).map((o) => o.label).join(', ')
const today = computed(() => new Date().toLocaleDateString('de-DE'))

function print() { window.print() }

// Immer im hellen Design drucken
let theme: string | null = null
function before() { theme = document.documentElement.getAttribute('data-theme'); document.documentElement.removeAttribute('data-theme') }
function after() { if (theme) document.documentElement.setAttribute('data-theme', theme) }
onMounted(() => { window.addEventListener('beforeprint', before); window.addEventListener('afterprint', after); build() })
onBeforeUnmount(() => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after) })
</script>

<template>
  <section class="print-tab">
    <div class="controls">
      <fieldset>
        <legend>Übungen</legend>
        <label v-for="ex in PRINTABLE" :key="ex" class="check">
          <input v-model="chosen" type="checkbox" :value="ex" @change="build" /> {{ registry[ex].label }}
        </label>
      </fieldset>
      <label>Niveau
        <select v-model.number="level" data-testid="print-level" @change="build">
          <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
        </select>
      </label>
      <label>Aufgaben je Übung
        <select v-model.number="perExercise" @change="build">
          <option v-for="n in [1, 2, 3, 4]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <div class="buttons">
        <BigButton label="Neu zusammenstellen" :icon="RefreshCw" @press="build" />
        <BigButton label="Drucken" :icon="Printer" variant="primary" :disabled="!tasks.length" data-testid="print" @press="print" />
      </div>
      <p v-if="skipped.length" class="note">Keine Inhalte für Niveau {{ level }}: {{ skipped.join(', ') }}</p>
    </div>

    <div class="print-sheet" data-testid="print-sheet">
      <header class="sheet-head">
        <h2>Übungsblatt</h2>
        <span>Name: ____________________ Datum: {{ today }}</span>
      </header>

      <article v-for="(t, i) in tasks" :key="i" class="item">
        <h3><span class="num">{{ i + 1 }}.</span> {{ registry[t.exercise].label }}: {{ t.prompt }}</h3>
        <div class="stage">
          <component :is="prompts[t.exercise]" :task="t" phase="print" />
        </div>
        <p v-if="readAloud(t)" class="time">Zeit: ______ Minuten ______ Sekunden</p>
        <ul v-else-if="!t.custom" class="choices">
          <li v-for="o in t.options" :key="o.id">
            <span class="box" aria-hidden="true" />
            <span v-if="o.swatch" class="swatch" :style="{ background: `var(${o.swatch})` }" />
            <img v-for="n in (o.image ? Math.min(o.count ?? 1, 4) : 0)" :key="n" :src="productImage(o.image)" alt="" class="pic" />
            <img v-for="n in (o.image ? Math.min(o.count ?? 1, 4) : 0)" :key="n" :src="productImage(o.image)" alt="" class="pic" />
            <component :is="iconByName(o.icon)" v-if="o.icon" :size="32" :stroke-width="1.75" />
            {{ o.label }}
          </li>
        </ul>
        <p v-if="t.select === 'multi'" class="multi">Mehrere Antworten ankreuzen.</p>
      </article>

      <section class="solutions">
        <h2>Lösungen</h2>
        <ol>
          <li v-for="(t, i) in tasks" :key="i">{{ answerOf(t) }}</li>
        </ol>
      </section>
    </div>
  </section>
</template>

<style scoped>
.controls { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-end; margin-bottom: var(--space-4); font-size: var(--text-help); }
fieldset { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); border: 2px solid var(--color-line); border-radius: 12px; }
.check { display: inline-flex; gap: 6px; align-items: center; }
select { font-size: inherit; min-height: 48px; margin-left: var(--space-1); }
.buttons { display: flex; gap: var(--space-2); }
.note { width: 100%; margin: 0; color: var(--color-text-muted); }

.print-sheet { background: #fff; color: #000; padding: var(--space-4); border: 2px solid var(--color-line); border-radius: 12px; max-width: 210mm; }
.sheet-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; margin-bottom: 8mm; }
.sheet-head h2 { margin: 0; font-size: 18pt; }
.item { break-inside: avoid; margin-bottom: 10mm; }
.item h3 { margin: 0 0 4mm; font-size: 14pt; text-align: left; }
.stage { display: flex; justify-content: center; }
.stage :deep(.stage-word) { font-size: 28pt; }
.stage :deep(.clock) { display: none; }
.stage :deep(svg) { width: 48px; height: 48px; }
.choices { list-style: none; display: flex; flex-wrap: wrap; gap: 3mm 10mm; padding: 0; margin: 4mm 0 0; font-size: 14pt; }
.choices li { display: inline-flex; align-items: center; gap: 2mm; }
.pic { width: 12mm; height: 12mm; object-fit: contain; }
.box { width: 6mm; height: 6mm; border: 2px solid #000; border-radius: 2px; }
.swatch { width: 6mm; height: 6mm; border-radius: 50%; }
.time, .multi { margin: 3mm 0 0; font-size: 12pt; }
.solutions { break-before: page; font-size: 12pt; }
.solutions h2 { font-size: 16pt; }
</style>

<style>
@media print {
  @page { size: A4; margin: 15mm; }
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-sheet { position: absolute; inset: 0 auto auto 0; border: 0 !important; padding: 0 !important; max-width: none !important; }
  html, body, #app, .admin, .tabs, .scroll { height: auto !important; overflow: visible !important; }
}
</style>
