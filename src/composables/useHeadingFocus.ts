import { nextTick } from 'vue'

/**
 * Screenreader: Nach einem Ansichtswechsel (neue Seite, neue Aufgabe, Pause …) den Fokus auf die
 * Hauptüberschrift setzen, damit sie vorgelesen wird und die Tab-Reihenfolge oben beginnt.
 */
export async function focusHeading(selector = 'main h1'): Promise<void> {
  await nextTick()
  const h = document.querySelector<HTMLElement>(selector)
  if (!h) return
  if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
  h.focus({ preventScroll: false })
}

const TITLES: Record<string, string> = {
  start: 'Start',
  training: 'Training',
  verwaltung: 'Verwaltung',
  vorschau: 'Vorschau',
}

export function titleFor(routeName: unknown): string {
  const t = typeof routeName === 'string' ? TITLES[routeName] : undefined
  return t ? `${t} – Gedächtnisstunde` : 'Gedächtnisstunde'
}
