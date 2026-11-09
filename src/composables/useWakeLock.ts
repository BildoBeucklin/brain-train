import { onBeforeUnmount, onMounted } from 'vue'

/** Verhindert die Bildschirmsperre, solange die Komponente sichtbar ist (auch in WebView2). */
export function useWakeLock(): void {
  let lock: WakeLockSentinel | null = null

  async function acquire() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
    } catch { /* z. B. Energiesparmodus – dann eben ohne */ }
  }
  const onVisibility = () => { if (document.visibilityState === 'visible') void acquire() }

  onMounted(() => { void acquire(); document.addEventListener('visibilitychange', onVisibility) })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    void lock?.release()
    lock = null
  })
}
