<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useProfileStore } from '@/stores/profile'
import { useSettingsStore } from '@/stores/settings'

const ready = ref(false)
const failed = ref(false)

onMounted(async () => {
  try {
    await Promise.all([useSettingsStore().load(), useContentStore().load(), useProfileStore().load()])
    ready.value = true
  } catch (e) {
    console.error(e)
    failed.value = true
  }
})
</script>

<template>
  <RouterView v-if="ready" />
  <main v-else-if="failed" class="boot">
    <p>Die Daten konnten nicht geladen werden. Bitte starten Sie das Programm neu.</p>
  </main>
  <main v-else class="boot" aria-busy="true" />
</template>

<style scoped>
.boot { display: grid; place-items: center; height: 100%; font-size: var(--text-task); padding: var(--space-6); }
</style>
