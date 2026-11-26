import { onBeforeUnmount, onMounted } from 'vue'

/** Optionale Tasten für die Begleitperson. Greift nicht, solange ein Eingabefeld den Fokus hat. */
export function useKeyboard(bindings: Record<string, () => void>, enabled: () => boolean): void {
  function onKey(e: KeyboardEvent) {
    if (!enabled() || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return
    const el = e.target as HTMLElement | null
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
    const fn = bindings[e.key.toLowerCase()]
    if (fn) { e.preventDefault(); fn() }
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
