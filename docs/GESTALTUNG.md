# Gestaltung und Barrierefreiheit

Verbindliche Vorgaben für alle Bildschirme. Ergänzt [ARCHITEKTUR.md](ARCHITEKTUR.md).

## Gestaltungsprinzipien (sehr wichtig)
- Eine Aufgabe pro Bildschirm, keine Menüs, keine Scrollbereiche, keine Tastatureingabe im Training.
- Ruhig, warm und erwachsen, nicht kindlich: keine Comicfiguren, keine Konfetti-Effekte, keine Punkte und keine Ranglisten.
- Fehlerfreundlich: kein Rot, keine Kreuze, keine Warnsymbole bei falschen Antworten.
- Viel Weißraum, klare Hierarchie, linksbündige Texte – außer der großen Aufgabe in der Mitte.

## Barrierefreiheit
- Kontrast mindestens 7:1 (WCAG AAA) für alle Texte, 3:1 für Rahmen und Icons.
- Schrift Atkinson Hyperlegible. Aufgabentext ≥ 40 px, Antworttext ≥ 32 px, Hilfetexte ≥ 24 px, nie kleiner als 20 px.
- Antwortflächen ≥ 96 px hoch und ≥ 280 px breit, 24 px Abstand, ganze Fläche klickbar.
- Information nie nur über Farbe: Richtig = grüner Rahmen + Häkchen-Icon + Text „Richtig!“.
- Sichtbarer Fokusrahmen (4 px, gelb #F3C54B mit dunklem Rand) auf allen bedienbaren Elementen.
- Icons immer mit Textlabel, nie allein.
- Keine Zeitlimits, keine Countdowns, keine automatischen Weiterleitungen.
- Rot-Grün-Schwäche: Farben der Farbübung mit Simulator geprüft (siehe unten).
- Hell- und Dunkelmodus als Varianten.

## Design-Tokens

Quelle: `src/styles/tokens.css`. Der Test `tests/unit/tokens.test.ts` prüft die Kontraste beider Themes.

| Token | Hell | Dunkel | Hinweis |
|---|---|---|---|
| `--color-bg` | #ECF1EF | #121A17 | |
| `--color-surface` | #FFFFFF | #1B2622 | |
| `--color-text` | #18231F | #EEF3F1 | |
| `--color-text-muted` | **#404D49** | #BAC7C2 | Vorgabe #55645F erreicht nur 5,4:1 |
| `--color-line` | #CCD8D3 | #33423D | nur dekorative Trennlinien |
| `--color-control-border` | **#6F7F79** | #7E8F89 | neu: Rahmen bedienbarer Flächen, ≥ 3:1 |
| `--color-accent` | #1E5E55 | #7CC8BB | Fläche; Text darauf `--color-on-accent` |
| `--color-on-accent` | #FFFFFF | #0B1513 | |
| `--color-accent-text` | **#1A5249** | #8FD3C7 | neu: Akzent als Schrift (#1E5E55 nur 6,6:1) |
| `--color-accent-soft` | #D6E8E3 | #1F3B35 | |
| `--color-success-border` | #2A7A33 | #6FD394 | |
| `--color-success-bg` | #E5F4E4 | #17301C | |
| `--color-neutral-bg` | #E4E8E6 | #2A3431 | ausgegraute Antwort |
| `--color-neutral-text` | **#404D49** | #BAC7C2 | Vorgabe #55645F nur 5,0:1 auf #E4E8E6 |
| `--color-focus` / `--color-focus-ring` | #F3C54B / #18231F | #F3C54B / #000000 | 4 px gelb + 2 px dunkler Rand |
| Radius | 16 px | | Karten und Antwortflächen |
| Abstände | 8er-Schritte (`--space-1` = 8 px … `--space-8` = 64 px) | | |

### Farben der Farbübung

| Farbe | Hell | Dunkel |
|---|---|---|
| Rot | #C42525 | #FF8A80 |
| Blau | #1B4FB8 | #8DB1FF |
| Grün | #2A7A33 | #73D48F |
| Orange | **#A84E00** | #FFAA5C |
| Lila | #7A3BA8 | #CDA6F0 |
| Braun | #7A4A20 | #D9AA80 |

- Die Farbwörter erscheinen nur sehr groß (≥ 56 px, fett). Dafür gilt nach WCAG AAA 4,5:1 (große Schrift). 7:1 schaffen Rot, Grün und Orange in keiner erkennbaren Tönung. Orange ist abgedunkelt, weil #D96500 nur 3,6:1 erreicht.
- Antwortflächen der Farbübung: Farbfeld **plus** Farbname in normaler Textfarbe, nie weiße Schrift auf der Farbe.
- Simulation (Viénot/Brettel, Protanopie und Deuteranopie, ΔE in Lab): verwechselbar (ΔE < 20) sind **Rot/Grün, Rot/Braun, Blau/Lila, Grün/Orange, Grün/Braun**.
- Regel im Generator: Die gesuchte Schriftfarbe ist nie mit einer der angebotenen Antworten verwechselbar. Grün kommt deshalb bei 4 Antworten nicht als Schriftfarbe vor. Der Test `stroop.test.ts` prüft das für alle Niveaus.

### Verlauf-Diagramm
Zwei Reihen „allein“ / „mit Begleitung“: Blau #2A78D6 / Orange #EB6834 (dunkel #3987E5 / #D95926), mit dem dataviz-Validator geprüft (Farbsehschwäche ΔE ≥ 24, Kontrast ≥ 3:1 auf der Fläche). Legende, Summe über jedem Balken, Tooltip, Tabellenansicht. Die Teal-Töne der App fallen dort durch (zu wenig Sättigung, Kontrast < 3:1).

## Komponenten
- **AnswerButton**: Standard / Hover / Fokus / Gedrückt / Richtig (grüner Rahmen, Häkchen, „Richtig!“) / Ausgegraut (grau, leicht durchgestrichen, nicht klickbar) / Lösung (hervorgehoben, „Das ist die richtige Antwort“).
- Bei Mehrfachauswahl (Merken) steht auf Lösungskarten kurz „Das war dabei“, Icon neben dem Text – sonst passen 9 Karten nicht auf 1280×800.
- **AnswerGrid**: 2 = nebeneinander, 3 = Reihe, 4 = 2×2.
- **ProgressDots**: 5 Punkte je Block, ausgefüllt = erledigt (ohne richtig/falsch).
- **HintBanner**: ruhiger Hinweis mit Glühbirne, z. B. „Schauen Sie noch einmal genau hin. Lesen Sie von rechts nach links.“
- **ProfileTile**: großes Symbol (Blume, Sonne, Vogel, Katze, Anker, Kaffeetasse) in eigener Farbe + Rufname.
- **CompanionBar** (nur betreut): 72 px hoch, unten, dezent abgesetzt; „Tipp“, „Hinweis geben“, „Lösung ansehen“, „Mündlich richtig“, „Nicht gewusst“, „Überspringen“, Niveau „− 4 +“ mit „Festhalten“, „Pause“, „Beenden“. Schrift 20 px (für die Begleitperson).
  - Umsetzung: Icon über der Beschriftung, Zwei-Wort-Labels zweizeilig – so passt die Leiste mit Puffer auf 1280 px.
  - „Tipp“ öffnet ein Popover (per Klick/Touch) statt eines Tooltips, weil Tooltips auf Touchscreens nicht aufgehen.
  - „Lösung ansehen“ zeigt „Lösung: …“ als kleines dunkles Schild direkt über der Leiste, solange gedrückt.
  - „− / +“ rechnet vom angezeigten Niveau aus (beim Aufwärmen eins unter dem gespeicherten) und stellt die Aufgabe sofort neu.
  - Neue Profile (noch keine Einheit) starten mit eingeschaltetem „Mit Begleitung“.
- Großer **Pause-Button** oben rechts im Training (Icon + „Pause“).

## Bildschirme
1. Start: „Guten Tag! Wer trainiert heute?“, 6 ProfileTiles, Schalter „Mit Begleitung“, „Los geht’s“.
2. Begrüßung: „Schön, dass Sie da sind, Maria. Heute üben wir etwa 15 Minuten.“ – „Anfangen“.
3. Auf dem Kopf: „Welches Wort steht hier auf dem Kopf?“, „BROT“ um 180° gedreht, Antworten BROT, BOOT, ROT.
4. Nach falscher Antwort: gewählte Antwort ausgegraut, HintBanner, andere bleiben klickbar.
5. Nach richtiger Antwort: grüner Rahmen, Häkchen, „Richtig!“, „Weiter“.
6. Farben lesen (schwer): „Welche Farbe hat die Schrift?“, „Blau“ in Orange, 4 Farbfelder mit Text.
7. Merken, Phase 1: „Merken Sie sich diese 3 Dinge“ (Schlüssel, Brille, Hut), „Ich habe sie mir gemerkt“.
8. Merken, Phase 2: „Welche Dinge haben Sie gesehen? Tippen Sie alle an.“, 6 Karten, „Fertig“.
9. Was passt nicht?: Apfel, Birne, Kirsche, Hammer; danach Hammer hervorgehoben, „Ein Hammer ist kein Obst.“
10. Zwischenbildschirm: „Gut gemacht! Möchten Sie weitermachen?“ – „Weiter“ (primär), „Pause machen“.
11. Leerlauf-Overlay nach 2 min: „Möchten Sie weitermachen?“ – „Ja, weiter“, „Pause“.
12. Abschluss: „Sie haben heute 15 Minuten trainiert. Bis zum nächsten Mal!“ – „Fertig“.
13. Betreut: Bildschirm 3 mit CompanionBar; bei gedrücktem „Lösung ansehen“ zeigt die Leiste klein „Lösung: BROT“.
14. Verwaltung: PIN mit 4 großen Ziffernfeldern und Bildschirm-Ziffernblock; Tabs „Profile“, „Inhalte“, „Verlauf“, „Einstellungen“. Verlauf je Profil: Minuten pro Woche als Balkendiagramm, Niveau je Übung (1–10) als Liste, Hinweis „Dies ist kein Test und keine Diagnose.“

Hinweis zu Bildschirm 6: Die Kombination „Schrift Orange, Antwort Grün“ ist bei Protanopie verwechselbar (ΔE 18). Der Generator ersetzt Grün dann durch eine unterscheidbare Farbe.
