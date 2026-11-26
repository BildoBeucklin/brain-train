import { productByKey } from './products'

const urls = import.meta.glob('@/assets/Store/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const byFile = Object.fromEntries(Object.entries(urls).map(([path, url]) => [path.split('/').pop()!, url]))

/** Bild-URL einer Ware (Schlüssel aus products.ts). */
export function productImage(key?: string): string | undefined {
  const pr = key ? productByKey(key) : undefined
  return pr ? byFile[pr.file] : undefined
}
