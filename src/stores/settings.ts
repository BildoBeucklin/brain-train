import { defineStore } from 'pinia'
import { reactive, watchEffect } from 'vue'
import { db } from '@/db/database'

export interface Settings {
  mode: 'alone' | 'assisted'
  sessionMinutes: number
  fontScale: 1 | 1.15 | 1.3 | 1.5 // 4 Stufen, nur die Schrift
  /** Größe der ganzen Oberfläche (Schrift, Flächen, Bilder); jederzeit über „Kleiner/Größer“ bzw. Strg +/− änderbar */
  zoom: number
  sound: boolean
  theme: 'light' | 'dark'
  /** Hoher Kontrast: Schwarz/Weiß/Gelb, unabhängig von Hell/Dunkel */
  contrast: boolean
}

export const ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const

export const DEFAULT_SETTINGS: Settings = {
  mode: 'alone',
  sessionMinutes: 15,
  fontScale: 1,
  zoom: 1,
  sound: false,
  theme: 'light',
  contrast: false,
}

/** Nächste Zoomstufe in Richtung dir (+1 größer, −1 kleiner). */
export function stepZoom(current: number, dir: 1 | -1): number {
  const i = ZOOM_STEPS.findIndex((z) => z >= current - 0.001)
  const at = i < 0 ? ZOOM_STEPS.length - 1 : i
  const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + dir))]!
  return next
}

export const useSettingsStore = defineStore('settings', () => {
  const values = reactive<Settings>({ ...DEFAULT_SETTINGS })

  async function load(): Promise<void> {
    const rows = await db.settings.where('key').anyOf(Object.keys(DEFAULT_SETTINGS)).toArray()
    for (const r of rows) (values as Record<string, unknown>)[r.key] = r.value
    // Noch nie eingestellt: Wunsch des Betriebssystems nach mehr Kontrast übernehmen
    if (!rows.some((r) => r.key === 'contrast') && typeof matchMedia !== 'undefined') {
      values.contrast = matchMedia('(prefers-contrast: more)').matches || matchMedia('(forced-colors: active)').matches
    }
  }

  async function set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    values[key] = value
    await db.settings.put({ key, value })
  }

  async function zoomBy(dir: 1 | -1): Promise<void> {
    await set('zoom', stepZoom(values.zoom, dir))
  }

  // --vw = 1 % der tatsächlich sichtbaren Breite in (gezoomten) CSS-px, damit Ränder beim Vergrößern schrumpfen
  function setVw(): void {
    if (typeof window === 'undefined') return
    document.documentElement.style.setProperty('--vw', `${window.innerWidth / (values.zoom || 1) / 100}px`)
  }

  // Theme, Schriftgröße und Zoom auf das Dokument anwenden
  watchEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = values.contrast ? 'contrast' : values.theme
    root.style.setProperty('--font-scale', String(values.fontScale))
    // CSS-zoom vergrößert alles gleichmäßig; das Layout bricht dabei neu um (Chromium/WebView2, Firefox ≥ 126)
    root.style.setProperty('zoom', String(values.zoom))
    setVw()
  })

  // --vh = 1 % der Fensterhöhe; Aufgaben passen sich damit bei 100 % an die Höhe an und wachsen beim Vergrößern mit
  if (typeof window !== 'undefined') {
    const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`)
    setVh()
    window.addEventListener('resize', () => { setVh(); setVw() })
  }

  return { values, load, set, zoomBy }
})
