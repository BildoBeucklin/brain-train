/** Payload für „Auf dem Kopf“ und „Rückwärts lesen“: ein Wort oder Satz mit ähnlichen Ablenkern. */
export interface WordPayload {
  text: string
  /** nach Ähnlichkeit sortiert, ähnlichster zuerst */
  distractors: string[]
}

export const upper = (s: string) => s.toLocaleUpperCase('de-DE')
