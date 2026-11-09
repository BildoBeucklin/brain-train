import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export const IDLE_MS = 2 * 60_000

/** Wird true nach `ms` ohne Eingabe. Kein Abbruch, kein Countdown – nur eine freundliche Nachfrage. */
export function useIdle(ms = IDLE_MS): { idle: Ref<boolean>; reset: () => void } {
  const idle = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function reset() {
    clearTimeout(timer)
    timer = setTimeout(() => { idle.value = true }, ms)
  }
  const onInput = () => { if (!idle.value) reset() }
  const events = ['pointerdown', 'keydown', 'wheel'] as const

  onMounted(() => { reset(); events.forEach((e) => window.addEventListener(e, onInput, { passive: true })) })
  onBeforeUnmount(() => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, onInput)) })

  return { idle, reset: () => { idle.value = false; reset() } }
}
