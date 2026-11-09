# Gedächtnisstunde

**Beschreibung:**
Trainingsprogramm für Gedächtnis und Konzentration, das Seniorinnen und Senioren selbst am PC bedienen – nur Antippen, 2 bis 4 große Antwortflächen, keine Tastatur. 9 Übungen mit adaptiver Schwierigkeit in 10 Niveaus (Ziel ca. 80 % Erfolg), fehlerfreundlich ohne Rot, Fehlerton oder Zeitdruck. Betreuter Modus mit Begleitleiste für eine Begleitperson. Pseudonyme Profile, Verlauf und Verwaltung hinter PIN. Kein Internet, keine Konten, alle Daten lokal. Auslieferung als Windows-Installer (.exe) und PWA. Keine Diagnose, kein Medizinprodukt.

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
- Phase 2: Engine und Adaptivität
- Phase 3: Training allein
- Phase 4: Betreuter Modus
- Phase 5: Verwaltung und Verlauf
- Phase 6: Paket und Pilot

**Standard Label:**
- Frontend, Engine, Datenbank, Desktop, Tests, UX, Inhalte, Datenschutz, Organisation

## Entwicklung

Voraussetzungen: Node 20+, Rust (rustup), Visual Studio Build Tools mit „Desktop development with C++“.

```sh
npm install
npm run dev          # Browser: http://localhost:5173
npm run tauri dev    # Desktop-Fenster
npm test             # Vitest
npm run tauri build  # Installer unter src-tauri/target/release/bundle/nsis/
```
