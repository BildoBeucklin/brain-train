import { z } from 'zod'
import type { GsDatabase, ItemRow } from './database'
import { PAYLOAD_SCHEMAS } from '@/exercises/schemas'

/**
 * Export/Import als JSON-Datei.
 * - 'inhalte': nur eigene Inhalte (source 'user'), zum Teilen zwischen Einrichtungen – keine Personendaten.
 * - 'sicherung': alles (Profile, Niveaus, Verlauf, Inhalte, Einstellungen ohne PIN) für dieses Gerät.
 */
export const BACKUP_FORMAT = 'gedaechtnisstunde'
export const BACKUP_VERSION = 1

const exerciseId = z.enum(['stroop', 'upsideDown', 'reverse', 'proverbs', 'oddOneOut', 'opposites', 'wordFinding', 'memory', 'math', 'mirror', 'shopping'])
const level = z.number().int().min(1).max(10)

const itemSchema = z.object({
  exercise: exerciseId,
  minLevel: level,
  maxLevel: level,
  payload: z.record(z.string(), z.unknown()),
  enabled: z.union([z.literal(0), z.literal(1)]).default(1),
})

const fileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().max(BACKUP_VERSION),
  kind: z.enum(['inhalte', 'sicherung']),
  exportedAt: z.number(),
  items: z.array(itemSchema),
  profiles: z.array(z.record(z.string(), z.unknown())).optional(),
  skills: z.array(z.record(z.string(), z.unknown())).optional(),
  sessions: z.array(z.record(z.string(), z.unknown())).optional(),
  attempts: z.array(z.record(z.string(), z.unknown())).optional(),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })).optional(),
})
export type BackupFile = z.infer<typeof fileSchema>

export async function exportContent(db: GsDatabase, now = Date.now()): Promise<BackupFile> {
  const items = await db.items.where('source').equals('user').toArray()
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, kind: 'inhalte', exportedAt: now,
    items: items.map(({ exercise, minLevel, maxLevel, payload, enabled }) => ({ exercise, minLevel, maxLevel, payload: payload as Record<string, unknown>, enabled })),
  }
}

export async function exportAll(db: GsDatabase, now = Date.now()): Promise<BackupFile> {
  const strip = <T extends { id?: number }>(rows: T[]) => rows
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, kind: 'sicherung', exportedAt: now,
    items: (await db.items.where('source').equals('user').toArray()).map(({ exercise, minLevel, maxLevel, payload, enabled }) =>
      ({ exercise, minLevel, maxLevel, payload: payload as Record<string, unknown>, enabled })),
    profiles: strip(await db.profiles.toArray()) as unknown as Record<string, unknown>[],
    skills: (await db.skills.toArray()) as unknown as Record<string, unknown>[],
    sessions: (await db.sessions.toArray()) as unknown as Record<string, unknown>[],
    attempts: (await db.attempts.toArray()) as unknown as Record<string, unknown>[],
    // PIN bleibt auf dem Gerät; Seed-Version wird vom Gerät selbst verwaltet
    settings: (await db.settings.toArray()).filter((s) => s.key !== 'pin' && s.key !== 'seedVersion'),
  }
}

export interface ImportResult { kind: BackupFile['kind']; added: number; skipped: number; invalid: number }

export class ImportError extends Error {}

export function parseBackup(text: string): BackupFile {
  let json: unknown
  try { json = JSON.parse(text) } catch { throw new ImportError('Die Datei ist keine gültige Gedächtnisstunde-Datei.') }
  const r = fileSchema.safeParse(json)
  if (!r.success) throw new ImportError('Die Datei ist keine gültige Gedächtnisstunde-Datei oder stammt aus einer neueren Version.')
  return r.data
}

const fingerprint = (i: Pick<ItemRow, 'exercise' | 'payload'>) => `${i.exercise}|${JSON.stringify(i.payload)}`

/**
 * Inhalte werden immer hinzugefügt (Duplikate übersprungen, ungültige verworfen).
 * Eine Sicherung ersetzt zusätzlich Profile, Niveaus und Verlauf – nur mit replacePeople = true.
 */
export async function importBackup(db: GsDatabase, file: BackupFile, opts: { replacePeople?: boolean } = {}): Promise<ImportResult> {
  const result: ImportResult = { kind: file.kind, added: 0, skipped: 0, invalid: 0 }
  await db.transaction('rw', [db.items, db.profiles, db.skills, db.sessions, db.attempts, db.settings], async () => {
    const existing = new Set((await db.items.toArray()).map(fingerprint))
    const toAdd: ItemRow[] = []
    for (const raw of file.items) {
      const schema = PAYLOAD_SCHEMAS[raw.exercise]
      const p = schema?.safeParse(raw.payload)
      if (!p?.success || raw.minLevel > raw.maxLevel) { result.invalid++; continue }
      const row: ItemRow = { exercise: raw.exercise, minLevel: raw.minLevel as ItemRow['minLevel'], maxLevel: raw.maxLevel as ItemRow['maxLevel'], payload: p.data, source: 'user', enabled: raw.enabled }
      const fp = fingerprint(row)
      if (existing.has(fp)) { result.skipped++; continue }
      existing.add(fp)
      toAdd.push(row)
    }
    await db.items.bulkAdd(toAdd)
    result.added = toAdd.length

    if (file.kind === 'sicherung' && opts.replacePeople) {
      await Promise.all([db.profiles.clear(), db.skills.clear(), db.sessions.clear(), db.attempts.clear()])
      await db.profiles.bulkAdd((file.profiles ?? []) as never[])
      await db.skills.bulkAdd((file.skills ?? []) as never[])
      await db.sessions.bulkAdd((file.sessions ?? []) as never[])
      await db.attempts.bulkAdd((file.attempts ?? []) as never[])
      await db.settings.bulkPut((file.settings ?? []).filter((s) => s.key !== 'pin' && s.key !== 'seedVersion'))
    }
  })
  return result
}

export const LAST_EXPORT_KEY = 'lastBackupAt'
export const BACKUP_REMINDER_DAYS = 30

export async function markExported(db: GsDatabase, now = Date.now()): Promise<void> {
  await db.settings.put({ key: LAST_EXPORT_KEY, value: now })
}

/** Erinnerung, wenn die letzte Sicherung länger als 30 Tage her ist (oder es Profile, aber nie eine Sicherung gab). */
export async function backupDue(db: GsDatabase, now = Date.now()): Promise<boolean> {
  if ((await db.profiles.count()) === 0) return false
  const last = (await db.settings.get(LAST_EXPORT_KEY))?.value as number | undefined
  return last === undefined || now - last > BACKUP_REMINDER_DAYS * 86_400_000
}

export function backupFileName(kind: BackupFile['kind'], now = new Date()): string {
  const d = now.toISOString().slice(0, 10)
  return kind === 'inhalte' ? `Gedaechtnisstunde-Inhalte-${d}.json` : `Gedaechtnisstunde-Sicherung-${d}.json`
}
