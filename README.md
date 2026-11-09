# Gedächtnisstunde

**Beschreibung:**
Offline-App für Gedächtnistraining in Gruppen (Senioreneinrichtungen). Eine Betreuungskraft bedient die App am PC, die Gruppe sieht die Aufgabe groß auf Beamer oder TV und antwortet mündlich. 9 Übungen plus gemischter Modus, je 3 Schwierigkeitsstufen. Kein Internet, keine Konten, keine personenbezogenen Daten; alle Daten bleiben lokal. Auslieferung als Windows-Installer (.exe) und als installierbare PWA. Fachliche Vorlage ist der bestehende HTML-Prototyp.

Ausführliches Konzept: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md)

**Tech Stack:**
- Vue 3 (Composition API, `<script setup>`), TypeScript, Vite
- Pinia, vue-router, Dexie (IndexedDB), zod
- Reka UI (ehemals radix-vue), lucide-vue-next, CSS-Variablen, Atkinson Hyperlegible (@fontsource)
- vite-plugin-pwa (Workbox)
- Tauri 2 mit NSIS-Installer (Alternative: Electron + electron-builder)
- Vitest, @vue/test-utils, Playwright

**Known Deadlines:**
- Konzept: 30. Okt. 2026
- Pilot in einer Einrichtung: noch offen

**Milestones:**
- Phase 1: Grundgerüst
- Phase 2: Übungs-Engine
- Phase 3: Moderationsansicht (danach Stand des HTML-Prototyps)
- Phase 4: Inhalte und Daten
- Phase 5: Zwei Bildschirme und PWA
- Phase 6: Paket und Pilot

**Standard Label:**
- Frontend, Engine, Datenbank, Desktop, Tests, UX, Organisation

## Entwicklung

Voraussetzungen: Node 20+, Rust (rustup), Visual Studio Build Tools mit „Desktop development with C++“.

```sh
npm install
npm run dev          # Browser: http://localhost:5173
npm run tauri dev    # Desktop-Fenster
npm test             # Vitest
npm run tauri build  # Installer unter src-tauri/target/release/bundle/nsis/
```
