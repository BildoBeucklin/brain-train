<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Info, Pin } from 'lucide-vue-next'
import { PROFILE_ICONS, iconByName } from '@/components/icons'
import { db, type Attempt, type Session, type Skill } from '@/db/database'
import { EXERCISE_IDS, registry } from '@/exercises/registry'
import { levelsByExercise, minutesPerWeek, type ExerciseLevel, type WeekMinutes } from '@/lib/history'
import { useProfileStore } from '@/stores/profile'
import WeekChart from './WeekChart.vue'

/** Verlauf je Profil: Minuten pro Woche und Niveau je Übung. Ausdrücklich kein Test und keine Diagnose. */
const profile = useProfileStore()
const selected = ref<number | null>(profile.profiles[0]?.id ?? null)
const weeks = ref<WeekMinutes[]>([])
const levels = ref<ExerciseLevel[]>([])
const totalAssisted = ref(0)

watch(selected, async (id) => {
  if (id == null) return
  const [sessions, attempts, skills] = await Promise.all([
    db.sessions.where('profileId').equals(id).toArray() as Promise<Session[]>,
    db.attempts.where('profileId').equals(id).toArray() as Promise<Attempt[]>,
    db.skills.where('profileId').equals(id).toArray() as Promise<Skill[]>,
  ])
  weeks.value = minutesPerWeek(sessions, attempts, Date.now())
  levels.value = levelsByExercise(skills, attempts, EXERCISE_IDS)
  totalAssisted.value = attempts.filter((a) => a.assisted).length
}, { immediate: true })

const fmtDate = (ts?: number) => (ts ? new Date(ts).toLocaleDateString('de-DE') : '—')
const hasData = computed(() => weeks.value.some((w) => w.alone + w.assisted > 0))
</script>

<template>
  <section class="tab">
    <p class="disclaimer" role="note">
      <Info :size="28" aria-hidden="true" />
      <span><strong>Dies ist kein Test und keine Diagnose.</strong> Die Zahlen zeigen nur, wie viel geübt wurde und auf welchem Niveau die Aufgaben gerade gestellt werden.</span>
    </p>

    <div class="profiles" role="radiogroup" aria-label="Profil">
      <button
        v-for="p in profile.profiles" :key="p.id" type="button" role="radio" class="chip"
        :aria-checked="selected === p.id" :class="{ on: selected === p.id }" @click="selected = p.id!"
      >
        <component :is="PROFILE_ICONS[p.icon]" :size="28" :style="{ color: `var(--profile-${p.icon})` }" aria-hidden="true" />
        {{ p.name }}
      </button>
    </div>

    <template v-if="selected != null">
      <WeekChart v-if="hasData" :weeks="weeks" />
      <p v-else class="muted">In den letzten 8 Wochen wurde mit diesem Profil noch nicht trainiert.</p>

      <h2>Niveau je Übung</h2>
      <ul class="levels" data-testid="levels">
        <li v-for="l in levels" :key="l.exercise" class="lv">
          <span class="ex"><component :is="iconByName(registry[l.exercise].icon)" :size="24" aria-hidden="true" />{{ registry[l.exercise].label }}</span>
          <span class="meter" role="meter" :aria-valuenow="l.level" aria-valuemin="1" aria-valuemax="10" :aria-label="`Niveau ${l.level} von 10`">
            <i v-for="n in 10" :key="n" :class="{ on: n <= l.level }" />
          </span>
          <span class="num">Niveau {{ l.level }}</span>
          <span class="meta">
            <template v-if="l.locked"><Pin :size="18" aria-hidden="true" /> festgehalten · </template>
            {{ l.practiced }} Aufgaben · zuletzt {{ fmtDate(l.lastAt) }}
          </span>
        </li>
      </ul>
      <p class="muted">Davon mit Begleitung beantwortet: {{ totalAssisted }} Aufgaben.</p>
    </template>
    <p v-else class="muted">Noch keine Profile angelegt.</p>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-3); }
.disclaimer {
  display: flex; gap: var(--space-2); align-items: flex-start; margin: 0;
  padding: var(--space-2) var(--space-3); border-radius: var(--radius);
  background: var(--color-accent-soft); font-size: var(--text-help);
}
.disclaimer :deep(svg) { color: var(--color-accent-text); flex: none; margin-top: 2px; }
.profiles { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.chip {
  display: inline-flex; align-items: center; gap: var(--space-1); min-height: 56px; padding: 0 var(--space-2);
  border: 2px solid var(--color-control-border); border-radius: 999px; background: var(--color-surface);
  color: var(--color-text); font-size: var(--text-help); cursor: pointer;
}
.chip.on { border-color: var(--color-accent); border-width: 4px; background: var(--color-accent-soft); font-weight: 700; }
h2 { margin: var(--space-2) 0 0; font-size: var(--text-help); }
.levels { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.lv {
  display: grid; grid-template-columns: 240px auto 110px 1fr; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-2); background: var(--color-surface); border-radius: 12px; font-size: var(--text-min);
}
.ex { display: inline-flex; align-items: center; gap: var(--space-1); font-weight: 700; }
.ex :deep(svg) { color: var(--color-accent-text); }
.meter { display: inline-flex; gap: 3px; }
.meter i { width: 16px; height: 24px; border-radius: 4px; border: 2px solid var(--color-control-border); }
.meter i.on { background: var(--color-accent); border-color: var(--color-accent); }
.num { font-weight: 700; font-variant-numeric: tabular-nums; }
.meta { color: var(--color-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.muted { margin: 0; color: var(--color-text-muted); font-size: var(--text-min); }
</style>
