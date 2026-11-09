# Gedächtnisstunde – Architektur und Umsetzung

30. Okt. 2026 · Konstantin Roßmann

## Ziel und Anforderungen

Die Gedächtnisstunde wird eine Vue-3-PWA, die als Windows-Programm (.exe) ausgeliefert wird und komplett offline läuft. Eine Betreuungskraft bedient sie am PC, die Gruppe sieht die Aufgabe groß auf Beamer oder TV und antwortet mündlich oder zeigt. Der bestehende HTML-Prototyp mit 9 Übungen und 3 Stufen ist die fachliche Vorlage.

### Muss
- 9 Übungen: Farben lesen, Auf dem Kopf, Rückwärts lesen, Sprichwörter, Was passt nicht?, Gegenteile, Begriffe finden, Merken, Rechnen, dazu ein gemischter Modus
- 3 Schwierigkeitsstufen pro Übung, jederzeit umschaltbar
- Ablauf pro Aufgabe: Zeigen → optional Verdecken → Lösung zeigen → Nächste Aufgabe
- Sehr große, kontrastreiche Schrift; Bedienung per Maus und Tastatur (Leertaste, Enter, 1–3, F)
- Läuft ohne Internet und ohne Konto; alle Daten bleiben lokal auf dem PC
- Installation per Doppelklick auf Windows 10/11

### Soll
- Eigene Inhalte anlegen (z. B. Wörter mit regionalem Bezug; Namen der Bewohner bleiben außen vor)
- Getrennte Ansichten: Moderation am Laptop, Präsentation auf dem zweiten Bildschirm
- Stundenprotokoll: welche Übungen in welcher Stufe gemacht wurden, ohne personenbezogene Daten
- Import und Export der Inhalte als Datei, um sie zwischen Einrichtungen zu teilen

### Nicht im Umfang
- Bewertung oder Punktestand einzelner Bewohner
- Cloud-Synchronisation und Benutzerkonten

## Tech-Stack

Für die .exe wird Tauri 2 statt Electron empfohlen: Installer ca. 5–10 MB statt ca. 80–120 MB, WebView2 ist auf Windows 10/11 vorhanden. radix-vue heißt seit Version 2 Reka UI (Paket `reka-ui`).

| Baustein | Paket | Aufgabe |
|---|---|---|
| Framework | vue 3 (Composition API, `<script setup>`), TypeScript | UI und Logik |
| Build | vite | Entwicklungsserver, Build |
| Zustand | pinia | Sitzung, Einstellungen, Inhalte im Speicher |
| Datenbank | dexie + liveQuery | IndexedDB: Inhalte, Einstellungen, Protokoll |
| UI-Primitive | reka-ui | Tabs, ToggleGroup, Dialog, Select, Tooltip |
| Icons | lucide-vue-next | Strich-Icons |
| PWA | vite-plugin-pwa (Workbox) | Manifest, Service Worker, Offline-Cache |
| Routing | vue-router | Moderation, Präsentation, Inhalte, Einstellungen |
| Styling | CSS-Variablen, keine UI-Bibliothek | Hell/Dunkel, große Schrift |
| Schrift | Atkinson Hyperlegible (@fontsource) | lesbar bei Sehschwäche, offline |
| Desktop | @tauri-apps/cli 2, NSIS | Windows-Installer |
| Tests | vitest, @vue/test-utils, playwright | Generatoren, Komponenten, Ablauf |

**Tauri statt Electron:** kleiner, weniger RAM (ältere Heim-PCs), kein Node.js zur Laufzeit. Gegenargument: Rust im Build. Alternative ohne Rust: Electron + electron-builder, Vue-App unverändert.

## Architekturüberblick

Die Oberfläche spricht nur mit den Pinia-Stores; nur `content` und `settings` lesen und schreiben in Dexie. Die Übungs-Engine ist der Erweiterungspunkt: Sie bekommt Inhalte über `draw()` und kennt weder DOM noch Datenbank. Moderation und Präsentation gleichen sich über einen BroadcastChannel ab.

### Projektstruktur

```
gedaechtnisstunde/
├─ src-tauri/                  tauri.conf.json, Icons, main.rs
├─ public/                     PWA-Icons (192, 512, maskable), favicon
├─ src/
│  ├─ main.ts, App.vue, router.ts
│  ├─ db/          database.ts, seed/, backup.ts
│  ├─ stores/      session.ts, settings.ts, content.ts
│  ├─ exercises/   types.ts, registry.ts, stroop/, upside-down/, reverse/, proverbs/,
│  │               odd-one-out/, opposites/, word-finding/, memory/, math/, mixed/
│  ├─ components/  stage/ (StageFrame, BigWord, Tiles, Quote, Receipt, Dots, Solution)
│  │               controls/ (ExerciseTabs, LevelToggle, ControlBar, FullscreenButton)
│  ├─ composables/ useKeyboard, useFullscreen, useWakeLock, usePresenterChannel
│  ├─ views/       ModerationView, PresentationView, ContentView, SettingsView
│  └─ styles/      tokens.css, base.css
├─ tests/          unit/, e2e/
└─ vite.config.ts, package.json
```

## Datenmodell (Dexie)

| Tabelle | Schlüssel und Indizes | Inhalt |
|---|---|---|
| items | `++id, [exercise+level], exercise, source, enabled, seedKey` | Aufgabeninhalt mit `payload` je Übungstyp |
| settings | `key` | Schlüssel-Wert-Paare |
| sessions | `++id, startedAt` | Gruppenstunde mit Datum und Dauer |
| sessionEvents | `++id, sessionId, [sessionId+at]` | Übung, Stufe, Zeitpunkt |

`source: 'seed' | 'user'`; `enabled` als 0/1 (indizierbar); `seedKey` als stabile ID der Standardinhalte.

### Seed und Updates
1. Standardinhalte als JSON in `src/db/seed/` mit Versionsnummer.
2. Beim Start vergleicht `content.ts` die Seed-Version mit `settings.seedVersion`.
3. Ist sie neuer: `source:'seed'`-Einträge per `seedKey` aktualisieren/ergänzen (`bulkPut`); eigene Einträge bleiben unberührt.
4. Schemaänderungen über `this.version(2).stores(…).upgrade(…)`.

### Datensicherheit
- Beim ersten Start `navigator.storage.persist()`.
- Export/Import über dexie-export-import als .json; in Tauri über `@tauri-apps/plugin-dialog`.

## Pinia-Stores

| Store | State | Actions | Persistenz |
|---|---|---|---|
| content | Items je Übung/Stufe, Shuffle-Bags | load, draw, addItem, updateItem, toggleItem | items (liveQuery) |
| session | exercise, level, task, phase, count, sessionId | start, next, advance, setExercise, setLevel, end | sessionEvents |
| settings | fontScale, theme, showTips, presenterMode, letzte Übung/Stufe | set | settings |

Shuffle-Bags: keine Wiederholung, bevor alle Inhalte einer Stufe einmal dran waren.

## Übungs-Engine

Jede Übung ist eine `ExerciseDefinition`: reiner Generator (`generate(ctx) → Task`) plus Stage-Komponente (Props `task`, `phase`). `GenerateContext` enthält `level`, `draw` und ein injizierbares `random` für deterministische Tests. Optional `itemSchema` (zod) für den Editor.

| Übung | Quelle | Leicht | Mittel | Schwer |
|---|---|---|---|---|
| Farben lesen | generiert | 3 Wörter, Farbe passt | 4 Wörter, Wort lesen | 5 Wörter, Schriftfarbe nennen |
| Auf dem Kopf | Inhalte | kurze Wörter, Großbuchstaben | längere Wörter, gemischt | kurze Sätze |
| Rückwärts lesen | Inhalte | 3–4 Buchstaben | 5–7 Buchstaben | 10–14 Buchstaben |
| Sprichwörter | Inhalte | bekannte ergänzen | seltenere ergänzen | Bedeutung erklären |
| Was passt nicht? | Inhalte | klare Kategorien | Wissen nötig | Fachwissen, Begründung |
| Gegenteile | Inhalte | heiß – kalt | Ebbe – Flut | großzügig – geizig |
| Begriffe finden | Inhalte | Kategorie sammeln | Anfangsbuchstabe | Wortteile, Stadt-Land-Fluss |
| Merken | Inhalte (Dinge) | 3 Dinge | 5 Dinge | 7 Dinge |
| Rechnen | generiert | Punkte zählen, bis 10 | bis 50, Einkauf | Rückgeld, Rückwärtszählen |
| Gemischt | andere Übungen | zufällige Übung in der gewählten Stufe | | |

### Ablauf einer Aufgabe
1. `next()` ruft `generate()` auf; Phase `shown`.
2. Hat die Task `cover`, wird der Hauptknopf zu „Verdecken“; Phase `covered`, Stage zeigt Fragezeichen.
3. „Lösung zeigen“ setzt Phase `revealed`; die Stage hebt Antworten hervor.
4. Zweiter Klick blendet die Lösung aus; „Nächste Aufgabe“ beginnt bei 1.

## UI und Bedienung

Moderation (Steuerung, Tipp, Lösungsvorschau) und Präsentation (nur Frage und Aufgabe). Bei einem Bildschirm ist die Moderation zugleich Präsentation.

| Taste | Aktion |
|---|---|
| Leertaste, Pfeil rechts, Bild-ab (Presenter) | Nächste Aufgabe |
| Enter | Verdecken oder Lösung zeigen/ausblenden |
| 1, 2, 3 | Stufe Leicht, Mittel, Schwer |
| F | Vollbild |

**Zwei Bildschirme:** `/praesentation` in zweitem Fenster (Tauri `WebviewWindow`, Browser `window.open`), Sync von `task` und `phase` über `BroadcastChannel('gs-session')`; Moderation ist einzige Quelle.

**Barrierefreiheit:** Atkinson Hyperlegible, mind. 48 px auf 1080p, `fontScale` in 4 Stufen; Kontrast ≥ 7:1; Stroop-Farben je Theme, Rot/Grün nie als einziges Paar; keine Zeitlimits, Fehlertöne oder Punkte; `prefers-reduced-motion`; Wake Lock; zod-Validierung im Editor.

## PWA und Offline

Gleiche Codebasis als PWA und Tauri-App. Service Worker nur im Browser (`disable: isTauri`), `registerType: 'prompt'` (nie Update mitten in der Stunde), Hinweis nur in den Einstellungen. Schriften lokal gebündelt, keine Netzwerkzugriffe, CSP nur `self`.

## Desktop-Paket

Tauri 2 → NSIS-Installer `Gedaechtnisstunde_1.0.0_x64-setup.exe`, ohne Adminrechte (`installMode: currentUser`), Sprache Deutsch, `webviewInstallMode: embedBootstrapper`. Daten im WebView2-Profil unter `%LOCALAPPDATA%\de.rossmann-it.gedaechtnisstunde\`, bleiben bei Updates erhalten.

**Build:** rustup, VS Build Tools („Desktop development with C++“), Node 20+; `npm i -D @tauri-apps/cli`, `npx tauri init`, `npx tauri add dialog`, `npx tauri add fs`, `npx tauri build`; CI auf Windows mit tauri-action.

**Signierung/Updates:** Ohne Authenticode-Zertifikat SmartScreen-Warnung → OV/EV-Zertifikat einplanen. Version 1 verteilt Installer manuell; `tauri-plugin-updater` später.

## Umsetzungsplan

1. **Grundgerüst** – fertig, wenn ein leeres Fenster als Tauri-App und im Browser startet.
2. **Übungs-Engine** – fertig, wenn Vitest jeden Generator für alle 3 Stufen mit festem Zufall prüft.
3. **Moderationsansicht** – fertig, wenn eine komplette Stunde mit einem Bildschirm läuft.
4. **Inhalte und Daten** – fertig, wenn eigene Einträge einen Seed-Update überstehen.
5. **Zwei Bildschirme und PWA** – fertig, wenn Playwright den Ablauf mit zwei Fenstern besteht.
6. **Paket und Pilot** – fertig, wenn Betreuungskräfte ohne Hilfe installieren und eine Stunde durchführen.

## Offene Fragen

- [ ] Tauri oder Electron? (Empfehlung Tauri; Rust im Build akzeptabel?)
- [ ] Code-Signing-Zertifikat: wer beschafft es, auf welchen Firmennamen?
- [ ] Hardware in den Heimen (Laptop + Beamer, Smart-TV, nur ein PC)?
- [ ] Fachliche Prüfung der Standardinhalte; regionale Varianten?
- [ ] Stundenprotokoll: Übung + Stufe + Datum, oder Dauer pro Übung?
- [ ] Verteilung: USB-Stick/Download oder Softwareverteilung des Trägers?

## Risiken

| Risiko | Folge | Gegenmaßnahme |
|---|---|---|
| IndexedDB wird gelöscht | Eigene Inhalte weg | `storage.persist()`, Export-Erinnerung alle 30 Tage |
| Alter PC ohne WebView2 | App startet nicht | embedBootstrapper |
| SmartScreen-Warnung | Installation abgebrochen | Code-Signing, bis dahin bebilderte Anleitung |
| Farbsehschwäche | Stroop nicht lösbar | Farbsets wählbar, Rot/Grün nie allein |
| Reka-UI-API-Änderungen | Update-Aufwand | Version pinnen, Primitive kapseln |
