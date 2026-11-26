import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/database'
import { hasPin, setPin, verifyPin } from '@/lib/pin'

/** Zugang zur Verwaltung. Entsperrt bleibt sie nur bis zum Verlassen oder 10 Minuten ohne Eingabe. */
export const AUTO_LOCK_MS = 10 * 60_000

export const useAdminStore = defineStore('admin', () => {
  const unlocked = ref(false)
  const pinSet = ref<boolean | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function refresh(): Promise<void> {
    pinSet.value = await hasPin(db)
  }

  function touch(): void {
    clearTimeout(timer)
    if (unlocked.value) timer = setTimeout(lock, AUTO_LOCK_MS)
  }

  async function unlock(pin: string): Promise<boolean> {
    const ok = await verifyPin(db, pin)
    unlocked.value = ok
    touch()
    return ok
  }

  async function createPin(pin: string): Promise<void> {
    await setPin(db, pin)
    pinSet.value = true
    unlocked.value = true
    touch()
  }

  function lock(): void {
    unlocked.value = false
    clearTimeout(timer)
  }

  return { unlocked, pinSet, refresh, unlock, createPin, lock, touch }
})
