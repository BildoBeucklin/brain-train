# Gedächtnisstunde – Architektur und Umsetzung

30. Okt. 2026 · Konstantin Roßmann

## Ziel und Anforderungen

Die Gedächtnisstunde wird ein Trainingsprogramm, das Seniorinnen und Senioren selbst am PC bedienen, ähnlich wie SimA®-basic-PC aus der Forschung von Wolf D. Oswald, aber moderner und mit einer Schwierigkeit, die sich in 10 Niveaus automatisch anpasst. Der betreute Modus ist dieselbe App: Eine Begleitperson sitzt daneben, führt bei Bedarf die Maus und bekommt eine zusätzliche Leiste mit Hilfen. Ein Beamer-Modus für Gruppen entfällt.

### Muss
- Bedienung nur mit Maus oder Touchscreen: eine Aufgabe pro Bildschirm, 2 bis 4 große Antwortflächen, keine Tastatur nötig
- 9 Übungen: Farben lesen, Auf dem Kopf, Rückwärts lesen, Sprichwörter, Was passt nicht?, Gegenteile, Begriffe finden, Merken, Rechnen
- Adaptive Schwierigkeit je Person und Übung, Niveau 1 bis 10; Ziel ist eine Erfolgsquote von etwa 80 %
- Fehlerfreundlich: kein Rot, kein Fehlerton, kein Zeitdruck; nach einem Fehler ein Hinweis, nach dem zweiten die Lösung mit Erklärung
- Trainingseinheit mit fester Länge (Standard 15 Minuten), die Übungen wechseln automatisch
- Betreuter Modus mit Begleitleiste: Hinweis, Überspringen, Niveau ändern, Pause, mündliche Antwort werten
- Läuft ohne Internet und ohne Konto; alle Daten bleiben lokal auf dem PC
- Installation per Doppelklick auf Windows 10/11

### Soll
- Mehrere Profile pro PC, pseudonym (Symbol und Rufname, kein Nachname)
- Offene Übungen nur im betreuten Modus, z. B. Begriffe sammeln oder ein Sprichwort erklären
- Verlauf je Profil für die Begleitperson: geübte Minuten und Niveau je Übung, ohne Bewertung
- Eigene Inhalte anlegen und als Datei zwischen Einrichtungen teilen
- Verwaltung (Profile, Inhalte, Einstellungen) hinter einer PIN

### Nicht im Umfang
- Diagnose, Tests oder Aussagen zum Krankheitsverlauf (sonst wäre die App ein Medizinprodukt)
- Übernahme von Aufgaben oder Material aus SimA; alle Inhalte sind eigene
- Cloud-Synchronisation, Benutzerkonten, Gruppenmodus am Beamer

## Tech-Stack

Tauri 2 statt Electron (Installer ca. 5–10 MB statt 80–120 MB, WebView2 auf Windows 10/11 vorhanden). radix-vue heißt seit Version 2 Reka UI (Paket `reka-ui`).

| Baustein | Paket | Aufgabe |
|---|---|---|
| Framework | vue 3 (Composition API, `<script setup>`), TypeScript | UI und Logik |
| Build | vite | Entwicklungsserver, Build |
| Zustand | pinia | Profil, Training, Einstellungen, Inhalte im Speicher |
| Datenbank | dexie + liveQuery | Profile, Niveaus, Antworten, Inhalte, Einstellungen |
| UI-Primitive | reka-ui | Toolbar, Dialog, NumberField, PinInput, Tooltip |
| Icons | lucide-vue-next | Strich-Icons |
| PWA | vite-plugin-pwa (Workbox) | Manifest, Service Worker, Offline-Cache |
| Routing | vue-router | Start, Training, Verlauf, Verwaltung |
| Styling | CSS-Variablen, keine UI-Bibliothek | Hell/Dunkel, große Schrift |
| Schrift | Atkinson Hyperlegible (@fontsource) | lesbar bei Sehschwäche, offline |
| Desktop | @tauri-apps/cli 2, NSIS | Windows-Installer |
| Tests | vitest, @vue/test-utils, playwright | Generatoren, Komponenten, Ablauf |

Gegenargument Tauri: Rust im Build. Alternative: Electron + electron-builder, Vue-App unverändert.

## Architekturüberblick

Allein und betreut laufen über dieselben Ansichten und Stores; im betreuten Modus blendet `settings.mode` nur die Begleitleiste ein. Die Übungs-Engine baut Aufgaben für Niveau 1 bis 10 und berechnet mit `nextLevel()` das nächste Niveau. Sie kennt weder DOM noch Datenbank; gespeichert wird nur über die Stores.

```
gedaechtnisstunde/
├─ src-tauri/                  tauri.conf.json, Icons, main.rs
├─ public/                     PWA-Icons, favicon
├─ src/
│  ├─ main.ts, App.vue
│  ├─ router.ts                /, /training, /verlauf, /verwaltung (PIN-Guard)
│  ├─ db/          database.ts, seed/, backup.ts
│  ├─ stores/      profile.ts, training.ts, content.ts, settings.ts
│  ├─ exercises/   types.ts, registry.ts, adaptive.ts, planner.ts,
│  │               stroop/, upside-down/, reverse/, proverbs/, odd-one-out/,
│  │               opposites/, word-finding/, memory/, math/
│  ├─ components/  training/ (TaskFrame, AnswerGrid, AnswerButton, Feedback, ProgressDots)
│  │               companion/ (CompanionBar, SolutionPeek, LevelStepper)
│  │               profile/ (ProfilePicker, ProfileEditor)
│  ├─ composables/ useIdle, useWakeLock, useSound, usePin
│  ├─ views/       StartView, TrainingView, HistoryView, AdminView
│  └─ styles/      tokens.css, base.css
├─ tests/          unit/, e2e/
└─ vite.config.ts, package.json
```

## Datenmodell (Dexie)

| Tabelle | Schlüssel und Indizes | Inhalt |
|---|---|---|
| profiles | `++id, name` | Rufname und Symbol, kein Nachname |
| skills | `[profileId+exercise], profileId` | Niveau 1–10, Serie, letzte Nutzung |
| attempts | `++id, sessionId, profileId, [profileId+exercise+at]` | Antwort: Niveau, richtig, Versuche, Hinweis, betreut, Dauer |
| sessions | `++id, profileId, startedAt` | Trainingseinheit mit Modus und Dauer |
| items | `++id, exercise, [exercise+minLevel], source, enabled, seedKey` | Inhalt mit Niveaubereich und Ablenkern |
| settings | `key` | Einstellungen und PIN-Hash |

Typen siehe `src/db/database.ts` (`Skill`, `Attempt`, `ItemRow` mit `minLevel`/`maxLevel`).

### Seed und Updates
1. Standardinhalte als JSON in `src/db/seed/`, jeder Eintrag mit Niveaubereich und Ablenkern.
2. Beim Start vergleicht `content.ts` die Seed-Version mit `settings.seedVersion`.
3. Ist sie neuer: `source:'seed'` per `seedKey` aktualisieren (`bulkPut`); eigene Einträge bleiben unberührt.
4. Schemaänderungen über `this.version(2).stores(…).upgrade(…)`.

### Datensicherheit
- Beim ersten Start `navigator.storage.persist()`.
- Export/Import über dexie-export-import als .json; in Tauri über `@tauri-apps/plugin-dialog`.
- Verlauf und Niveaus sind sensible Daten: nur lokal, Verwaltung und Verlauf hinter PIN, PIN nur als Hash (crypto.subtle, SHA-256 mit Salt).
- Profil löschen entfernt auch skills, attempts und sessions dieses Profils.

## Pinia-Stores

| Store | State | Actions | Persistenz |
|---|---|---|---|
| profile | current, skills je Übung | select, create, remove, applyResult | profiles, skills |
| training | session, plan, task, phase, tries, eliminated, remainingMs | start, answer, hint, skip, judge, pause, finish | sessions, attempts |
| content | items je Übung, bags | load, draw(exercise, level), addItem, updateItem | items (liveQuery) |
| settings | mode (`alone`/`assisted`), sessionMinutes, fontScale, sound, theme | set, checkPin | settings |

Phasen einer Aufgabe: `memorize` → `answer` → `feedback` | `solution`. Erster Fehler: falsche Antwort ausgrauen, Hinweis. Zweiter Fehler: Lösung mit Erklärung. Shuffle-Bags verhindern Wiederholungen, bevor alle Inhalte des passenden Niveaus dran waren.

## Übungs-Engine und adaptive Schwierigkeit

Jede Übung ist ein reiner Generator: aus Niveau 1–10 eine Aufgabe mit 2–4 Antworten, genau einer richtigen, einem Hinweis und einer Erklärung. Das Niveau steuert Zahl der Antworten, Wortlänge und Ähnlichkeit der Ablenker. `Task` enthält `prompt`, `data`, `options`, `correctId`, `hint`, `explanation?`, `memorize?`, `open?`.

| Übung | Antwort | Niveau 1–3 | Niveau 4–7 | Niveau 8–10 |
|---|---|---|---|---|
| Farben lesen | Farbe oder Wort | Wort und Farbe passen, 2 zur Wahl | Wort in fremder Farbe, Wort wählen, 3 | Schriftfarbe wählen, 4 |
| Auf dem Kopf | Wort | 3–4 Buchstaben, Großbuchst., 2 | 5–7 Buchstaben, gemischt, 3 | kurze Sätze, ähnliche Ablenker (b/d, p/q), 4 |
| Rückwärts lesen | Wort | 3–4 Buchstaben, 2 | 5–7 Buchstaben, 3 | 10–14 Buchstaben, ähnliche Ablenker, 4 |
| Sprichwörter | Ende | sehr bekannte, 2 | seltenere, 3 | Bedeutung wählen, 4 |
| Was passt nicht? | Karte | 3 Karten, klare Kategorie | 4 Karten | 5 Karten, Wissen nötig |
| Gegenteile | Wort | heiß – kalt, 2 | Ebbe – Flut, 3 | großzügig – geizig, 4 |
| Begriffe finden | Wort | „Was gehört in die Küche?“, 2 | Kategorie + Anfangsbuchstabe, 3 | Wortteile „…kuchen“, 4; betreut frei sammeln |
| Merken | gesehene Dinge | 2 Dinge, „War das dabei?“ Ja/Nein | 3–4 Dinge aus 6 | 5–7 Dinge aus 9 |
| Rechnen | Zahl | Punkte zählen bis 5, 2 | Plus/Minus bis 50, Einkauf, 3 | Rückgeld, großes Zahlenfeld |

### Adaptive Regel (`adaptive.ts`)
Nach 3 sauberen Treffern in Folge +1 Niveau, nach 2 Fehlern in Folge −1. Treffer mit Hinweis oder im zweiten Versuch zählt weder für den Aufstieg noch als Fehler (Serie auf 0).

```ts
export function nextLevel(skill: Skill, r: Result): Pick<Skill, 'level' | 'streak'> {
  const clean = r.correct && r.tries === 1 && !r.hint
  let streak = clean ? Math.max(skill.streak, 0) + 1
             : r.correct ? 0
             : Math.min(skill.streak, 0) - 1
  let level = skill.level
  if (streak >= 3)  { level = Math.min(10, level + 1) as Level; streak = 0 }
  if (streak <= -2) { level = Math.max(1, level - 1) as Level; streak = 0 }
  return { level, streak }
}
```
- Neue Profile starten auf Niveau 2 in jeder Übung.
- Nach mehr als 14 Tagen ohne Training startet die Übung ein Niveau tiefer.
- Betreut kann das Niveau festgehalten werden; die Regel pausiert dann für diese Übung.

### Ablauf einer Einheit (`planner.ts`)
1. Profil antippen, „Los geht’s“.
2. Aufwärmen: 3 Aufgaben einer beliebten Übung, ein Niveau unter dem gespeicherten.
3. Blöcke von 5 Aufgaben je Übung, Übungen wechseln; danach Zwischenbildschirm mit „Weiter“ und „Pause“.
4. Pro Aufgabe: richtig → kurzes Lob. Falsch → Hinweis, ausgegraut. Wieder falsch → Lösung hervorgehoben, Erklärung.
5. Nach der Einheitslänge endet der laufende Block, dann Abschluss mit geübten Minuten, ohne Punkte.

## Bedienung und betreuter Modus

| Ansicht | Inhalt |
|---|---|
| Start | Profilkacheln (Symbol, Rufname), Schalter „Mit Begleitung“, „Los geht’s“ |
| Training | Frage, Aufgabe, 2–4 Antwortflächen, Fortschrittspunkte, Pause |
| Zwischenbildschirm | Lob, „Weiter“ oder „Pause“ |
| Verlauf (PIN) | geübte Minuten pro Woche, aktuelles Niveau je Übung |
| Verwaltung (PIN) | Profile, Inhalte, Einheitslänge, Ton, Schriftgröße, Export/Import |

**Begleitleiste:** Tipp lesen (Tooltip, Info) · Hinweis geben (Lightbulb) · Lösung ansehen, solange gedrückt (Eye) · Mündlich richtig / Nicht gewusst (ThumbsUp, CircleHelp) · Überspringen (SkipForward) · Niveau −/+ und Festhalten (NumberField, Toggle; Minus, Plus, Pin) · Pause, Beenden (AlertDialog; Pause, CircleStop).
- Einschalten auf dem Start oder per 2 s langem Druck auf HandHelping oben rechts.
- Antworten betreut mit `assisted: true`, im Verlauf getrennt.
- Optionale Tasten: H Hinweis, S Überspringen, P Pause.

## Gestaltung für ältere Menschen
- Antwortflächen ≥ 96 px hoch, 24 px Abstand, ganze Fläche klickbar
- Klicks 400 ms entprellt
- Aufgabentext ≥ 40 px, Antworten ≥ 32 px auf 1080p; fontScale 4 Stufen
- Kontrast ≥ 7:1; Stroop-Farben je Theme, Rot/Grün nie als einziges Paar
- Richtig: grüner Rahmen, Häkchen, optional sanfter Ton. Falsch: Fläche grau, ruhiger Hinweis
- Nach 2 min ohne Eingabe: „Möchten Sie weitermachen?“, kein Abbruch, kein Countdown
- Profilsymbole aus Lucide (Flower2, Sun, Bird, Cat, Anchor, Coffee) mit eigener Farbe
- Wake Lock während der Einheit; prefers-reduced-motion
- zod im Inhalts-Editor; PIN über PinInputRoot

## PWA und Offline
Service Worker nur im Browser (`disable: isTauri`), `registerType: 'prompt'`, Update-Hinweis nur in den Einstellungen, nie während einer Einheit. Schriften lokal, keine Netzwerkzugriffe, CSP nur `self`.

## Desktop-Paket
NSIS-Installer ohne Adminrechte, Deutsch, `embedBootstrapper`, Fenster `main` im Vollbild. Daten unter `%LOCALAPPDATA%\de.rossmann-it.gedaechtnisstunde\`. Code-Signing (OV/EV) einplanen; Updates in Version 1 manuell, `tauri-plugin-updater` später.

## Umsetzungsplan
1. **Grundgerüst** – fertig, wenn ein leeres Vollbildfenster als Tauri-App und im Browser startet.
2. **Engine und Adaptivität** – Generatoren Niveau 1–10, `nextLevel()`, `planner.ts`, Seed mit Ablenkern. Fertig, wenn Vitest jeden Generator für alle 10 Niveaus und die Regel mit festen Antwortfolgen prüft.
3. **Training allein** – Profilwahl, Trainingsansicht, Hinweis-/Lösungsablauf, Zwischen-/Abschlussbildschirm, Wake Lock, Leerlauf. Fertig, wenn eine 15-Minuten-Einheit ohne Tastatur durchläuft.
4. **Betreuter Modus** – Begleitleiste, offene Aufgaben. Fertig, wenn Playwright beide Modi mit derselben Einheit besteht.
5. **Verwaltung und Verlauf** – PIN, Profile, Inhalts-Editor, Seed-Update, Export/Import, Verlauf, Service Worker. Fertig, wenn eigene Einträge einen Seed-Update überstehen.
6. **Paket und Pilot** – Installer, Signierung, Anleitung, 4 Wochen Pilot, Feinjustierung. Fertig, wenn Bewohner ohne Hilfe eine Einheit schaffen und Betreuungskräfte ohne Hilfe installieren.

## Offene Fragen
- [x] Tauri oder Electron? → Tauri (Rust-Toolchain vorhanden)
- [ ] Code-Signing-Zertifikat: wer beschafft es, auf welchen Firmennamen?
- [ ] Hardware: Maus, Touchscreen oder beides?
- [ ] Adaptive Regel: „3 hoch, 2 runter“ und Start 2, oder kurze Einstufung?
- [ ] Einheitslänge: Standard 15 Minuten oder je Profil?
- [ ] Fachliche Prüfung von Inhalten und Ablenkern
- [ ] Datenschutz: reichen pseudonyme Profile und PIN, oder DSFA nötig?
- [ ] Name und Abgrenzung: nicht nach SimA aussehen oder heißen; Vorbild nur als Inspiration

## Risiken

| Risiko | Folge | Gegenmaßnahme |
|---|---|---|
| Adaptive Regel zu streng | Frust, Abbruch | Abstieg nach 2 Fehlern, Hinweis kein Fehler, Pilot mit Auswertung |
| Bedienhürden bei Demenz | allein nicht zurecht | nur Antippen, keine Menüs, betreut als Standard für neue Profile |
| Leistungsdaten falsch gedeutet | Verlauf als Diagnose gelesen | keine Punkte, kein Trend-Urteil, Hinweis „kein Test“ |
| IndexedDB gelöscht | Profile und Inhalte weg | storage.persist(), Export-Erinnerung alle 30 Tage |
| Alter PC ohne WebView2 | App startet nicht | embedBootstrapper |
| SmartScreen-Warnung | Installation abgebrochen | Code-Signing, bebilderte Anleitung |
| Reka-UI-API-Änderungen | Update-Aufwand | Version pinnen, Primitive kapseln |
