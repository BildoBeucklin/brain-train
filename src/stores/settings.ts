import { defineStore } from 'pinia'
import { reactive, watchEffect } from 'vue'
import { db } from '@/db/database'

export interface Settings {
  mode: 'alone' | 'assisted'
  sessionMinutes: number
  fontScale: 1 | 1.15 | 1.3 | 1.5 // 4 Stufen
  sound: boolean
  theme: 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'alone',
  sessionMinutes: 15,
  fontScale: 1,
  sound: false,
  theme: 'light',
}

export const useSettingsStore = defineStore('settings', () => {
  const values = reactive<Settings>({ ...DEFAULT_SETTINGS })

  async function load(): Promise<void> {
    const rows = await db.settings.where('key').anyOf(Object.keys(DEFAULT_SETTINGS)).toArray()
    for (const r of rows) (values as Record<string, unknown>)[r.key] = r.value
  }

  async function set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    values[key] = value
    await db.settings.put({ key, value })
  }

  // Theme und Schriftgröße auf das Dokument anwenden
  watchEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = values.theme
    document.documentElement.style.setProperty('--font-scale', String(values.fontScale))
  })

  return { values, load, set }
})
