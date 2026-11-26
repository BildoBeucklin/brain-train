/** Klicks werden 400 ms entprellt, damit Zittern keine Doppelantwort auslöst (gilt app-weit). */
export const TAP_DEBOUNCE_MS = 400
let lastTap = -Infinity

export function acceptTap(now = performance.now()): boolean {
  if (now - lastTap < TAP_DEBOUNCE_MS) return false
  lastTap = now
  return true
}

/** Hüllt einen Handler in die Entprellung. */
export function tap<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  return (...args: A) => { if (acceptTap()) fn(...args) }
}

/** Nur für Tests. */
export function resetTap(): void { lastTap = -Infinity }
