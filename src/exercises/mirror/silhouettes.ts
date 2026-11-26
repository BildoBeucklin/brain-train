/** Silhouetten aus src/assets/Silhouette als Inline-SVG; Füllfarbe folgt der Textfarbe (hell/dunkel). */
const files = import.meta.glob<string>('@/assets/Silhouette/*.svg', { query: '?raw', import: 'default', eager: true })

function clean(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/class="st0"/g, '')
    .replace('<svg', '<svg fill="currentColor" aria-hidden="true" focusable="false"')
    .trim()
}

/** Dateiname ohne „.svg“ → bereinigtes SVG */
export const SILHOUETTES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.split('/').pop()!.replace(/\.svg$/, ''), clean(svg)]),
)
