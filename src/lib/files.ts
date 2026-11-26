/** Datei speichern/öffnen – in Tauri über die nativen Dialoge, im Browser über Download und Dateiauswahl. */

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const filters = [{ name: 'Gedächtnisstunde-Datei', extensions: ['json'] }]

/** Liefert false, wenn abgebrochen wurde. */
export async function saveTextFile(defaultName: string, text: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({ defaultPath: defaultName, filters })
    if (!path) return false
    await writeTextFile(path, text)
    return true
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: defaultName })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/** Liefert den Dateiinhalt oder null, wenn abgebrochen wurde. */
export async function openTextFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({ multiple: false, directory: false, filters })
    if (!path || Array.isArray(path)) return null
    return readTextFile(path)
  }
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' })
    input.addEventListener('change', async () => resolve(input.files?.[0] ? await input.files[0].text() : null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
