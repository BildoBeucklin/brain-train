import { ref, type Ref } from 'vue'
import { isTauri } from '@/lib/files'

/**
 * Service Worker nur in der Browser-Variante. registerType 'prompt': Ein Update wird erst
 * nach Rückfrage in den Einstellungen aktiviert, nie mitten in einer Einheit.
 */
const needRefresh = ref(false)
let update: ((reload?: boolean) => Promise<void>) | undefined
let started = false

export function startPwa(): void {
  if (started || isTauri() || import.meta.env.DEV || !('serviceWorker' in navigator)) return
  started = true
  void import('virtual:pwa-register').then(({ registerSW }) => {
    update = registerSW({ onNeedRefresh: () => { needRefresh.value = true } })
  }).catch(() => { /* ohne Service Worker weiter */ })
}

export function usePwaUpdate(): { needRefresh: Ref<boolean>; apply: () => Promise<void> } {
  return { needRefresh, apply: async () => { await update?.(true) } }
}
