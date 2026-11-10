import { z } from 'zod'
import type { ExerciseId } from '@/db/database'

/** Felder des Inhalts-Editors je Übung. Übungen ohne Inhalte (Farben lesen, Rechnen) fehlen hier. */
export type Field =
  | { key: string; label: string; type: 'text'; help?: string; optional?: boolean }
  | { key: string; label: string; type: 'list'; count: number; min: number; help?: string }

const text = (max = 120) => z.string().trim().min(1, 'Bitte ausfüllen').max(max, `Höchstens ${max} Zeichen`)
const list = (min: number, max = 80) => z.array(z.string().trim().max(max)).transform((xs) => xs.filter(Boolean))
  .pipe(z.array(z.string()).min(min, `Mindestens ${min} Einträge`))

export const CONTENT_FIELDS: Partial<Record<ExerciseId, Field[]>> = {
  upsideDown: [
    { key: 'text', label: 'Wort oder kurzer Satz', type: 'text' },
    { key: 'distractors', label: 'Ähnliche falsche Antworten (ähnlichste zuerst)', type: 'list', count: 3, min: 3 },
  ],
  reverse: [
    { key: 'text', label: 'Wort', type: 'text' },
    { key: 'distractors', label: 'Ähnliche falsche Antworten (ähnlichste zuerst)', type: 'list', count: 3, min: 3 },
  ],
  proverbs: [
    { key: 'start', label: 'Anfang', type: 'text', help: 'z. B. „Morgenstund hat“' },
    { key: 'end', label: 'Ende', type: 'text', help: 'z. B. „Gold im Mund.“' },
    { key: 'distractors', label: 'Falsche Enden', type: 'list', count: 3, min: 3 },
    { key: 'meaning', label: 'Bedeutung (für Niveau 8–10)', type: 'text', optional: true },
    { key: 'meaningDistractors', label: 'Falsche Bedeutungen', type: 'list', count: 3, min: 0 },
  ],
  oddOneOut: [
    { key: 'members', label: 'Was zusammengehört', type: 'list', count: 4, min: 4 },
    { key: 'odd', label: 'Was nicht passt', type: 'text' },
    { key: 'explanation', label: 'Begründung', type: 'text', help: 'z. B. „Ein Hammer ist kein Obst.“' },
  ],
  opposites: [
    { key: 'word', label: 'Wort', type: 'text' },
    { key: 'opposite', label: 'Gegenteil', type: 'text' },
    { key: 'distractors', label: 'Falsche Antworten (keine Gegenteile!)', type: 'list', count: 3, min: 3 },
  ],
  wordFinding: [
    { key: 'question', label: 'Frage', type: 'text', help: 'z. B. „Was gehört in die Küche?“' },
    { key: 'answer', label: 'Richtige Antwort', type: 'text' },
    { key: 'distractors', label: 'Falsche Antworten', type: 'list', count: 3, min: 3 },
    { key: 'hint', label: 'Hinweis nach dem 1. Fehler', type: 'text' },
    { key: 'explanation', label: 'Erklärung (optional)', type: 'text', optional: true },
    { key: 'openPrompt', label: 'Offene Frage für die Begleitung (optional)', type: 'text', optional: true },
  ],
  memory: [
    { key: 'thing', label: 'Ding', type: 'text', help: 'Ein Gegenstand, z. B. „Schlüssel“' },
  ],
}

const noDuplicateOf = (answerKey: string, listKey: string) => (v: Record<string, unknown>, ctx: z.RefinementCtx) => {
  const a = String(v[answerKey] ?? '').toLowerCase()
  const xs = (v[listKey] as string[] | undefined) ?? []
  if (xs.some((x) => x.toLowerCase() === a)) ctx.addIssue({ code: 'custom', path: [listKey], message: 'Die richtige Antwort darf nicht unter den falschen stehen' })
  if (new Set(xs.map((x) => x.toLowerCase())).size !== xs.length) ctx.addIssue({ code: 'custom', path: [listKey], message: 'Einträge doppelt' })
}

export const PAYLOAD_SCHEMAS: Partial<Record<ExerciseId, z.ZodType<Record<string, unknown>>>> = {
  upsideDown: z.object({ text: text(40), distractors: list(3, 40) }).superRefine(noDuplicateOf('text', 'distractors')),
  reverse: z.object({ text: text(16).regex(/^\S+$/, 'Nur ein Wort ohne Leerzeichen'), distractors: list(3, 20) }).superRefine(noDuplicateOf('text', 'distractors')),
  proverbs: z.object({
    start: text(), end: text(), distractors: list(3),
    meaning: z.string().trim().max(160).optional().transform((x) => x || undefined),
    meaningDistractors: list(0, 160).optional(),
  }).superRefine(noDuplicateOf('end', 'distractors')).superRefine((v, ctx) => {
    if (v.meaning && (v.meaningDistractors?.length ?? 0) < 3) ctx.addIssue({ code: 'custom', path: ['meaningDistractors'], message: 'Zur Bedeutung bitte 3 falsche Bedeutungen angeben' })
  }),
  oddOneOut: z.object({ members: list(4, 40), odd: text(40), explanation: text(160) }).superRefine(noDuplicateOf('odd', 'members')),
  opposites: z.object({ word: text(40), opposite: text(40), distractors: list(3, 40) }).superRefine(noDuplicateOf('opposite', 'distractors')),
  wordFinding: z.object({
    question: text(), answer: text(40), distractors: list(3, 40), hint: text(160),
    explanation: z.string().trim().max(80).optional().transform((x) => x || undefined),
    openPrompt: z.string().trim().max(160).optional().transform((x) => x || undefined),
  }).superRefine(noDuplicateOf('answer', 'distractors')),
  memory: z.object({ thing: text(30), icon: z.string().optional() }),
}

export const levelRange = z.object({ minLevel: z.number().int().min(1).max(10), maxLevel: z.number().int().min(1).max(10) })
  .refine((v) => v.minLevel <= v.maxLevel, { message: '„Ab Niveau“ muss kleiner oder gleich „bis Niveau“ sein', path: ['maxLevel'] })

/** Prüft einen Eintrag; liefert bereinigten Payload oder Fehlermeldungen je Feld. */
export function validateItem(exercise: ExerciseId, payload: unknown, minLevel: number, maxLevel: number):
  { ok: true; payload: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const schema = PAYLOAD_SCHEMAS[exercise]
  if (!schema) return { ok: false, errors: { _: 'Für diese Übung gibt es keine Inhalte' } }
  const errors: Record<string, string> = {}
  const range = levelRange.safeParse({ minLevel, maxLevel })
  if (!range.success) for (const i of range.error.issues) errors[String(i.path[0])] = i.message
  const p = schema.safeParse(payload)
  if (!p.success) for (const i of p.error.issues) errors[String(i.path[0] ?? '_')] ??= i.message
  return Object.keys(errors).length || !p.success ? { ok: false, errors } : { ok: true, payload: p.data }
}

/** Kurzbeschreibung eines Eintrags für Listen. */
export function itemSummary(exercise: ExerciseId, p: Record<string, unknown>): string {
  switch (exercise) {
    case 'proverbs': return `${p.start} ${p.end}`
    case 'oddOneOut': return `${(p.members as string[]).join(', ')} – nicht: ${p.odd}`
    case 'opposites': return `${p.word} ↔ ${p.opposite}`
    case 'wordFinding': return `${p.question} → ${p.answer}`
    case 'memory': return String(p.thing)
    default: return String(p.text)
  }
}
