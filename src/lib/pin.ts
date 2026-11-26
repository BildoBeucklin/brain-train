import type { GsDatabase } from '@/db/database'

/** PIN nur als Hash speichern: SHA-256 über Salt + PIN, Salt zufällig je Gerät. */
export const PIN_LENGTH = 4

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

interface PinRecord { salt: string; hash: string }

export async function hasPin(db: GsDatabase): Promise<boolean> {
  return !!(await db.settings.get('pin'))
}

export async function setPin(db: GsDatabase, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN muss aus 4 Ziffern bestehen')
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  await db.settings.put({ key: 'pin', value: { salt, hash: await hashPin(pin, salt) } satisfies PinRecord })
}

export async function verifyPin(db: GsDatabase, pin: string): Promise<boolean> {
  const rec = (await db.settings.get('pin'))?.value as PinRecord | undefined
  if (!rec) return false
  return (await hashPin(pin, rec.salt)) === rec.hash
}
