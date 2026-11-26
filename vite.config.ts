import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Tauri setzt TAURI_ENV_PLATFORM beim dev/build.
const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Im Tauri-Build liegen alle Dateien ohnehin lokal im Programm
      disable: isTauri,
      registerType: 'prompt', // Update erst nach Rückfrage, nie mitten im Training
      injectRegister: false, // Registrierung übernimmt src/composables/usePwaUpdate.ts
      workbox: { globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,json}'], navigateFallbackDenylist: [/^\/api/] },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Gedächtnisstunde',
        short_name: 'Gedächtnis',
        description: 'Gedächtnistraining für Seniorinnen und Senioren – offline, ohne Konto',
        lang: 'de',
        display: 'fullscreen',
        start_url: '.',
        theme_color: '#1E5E55',
        background_color: '#ECF1EF',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: isTauri ? 'es2022' : 'es2020',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
