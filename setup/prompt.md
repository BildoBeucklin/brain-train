# Prompt für AI

Du bist ein erfahrener Projektmanager.
Lies die Projektbeschreibung in der `README.md` im Hauptverzeichnis.

Erstelle basierend darauf einen konkreten Projektplan mit ca. 10-15 Aufgaben.
Erstelle eine JSON-Datei mit folgendem Format:

[
  {
    "title": "Docker-Umgebung einrichten",
    "body": "Docker Compose Konfiguration für FastAPI, SQLite, ChromaDB und Ollama erstellen.",
    "milestone_name": "Phase 1: PoC Core",
    "labels": ["Infrastruktur"],
    "due_offset_days": 14
  },
  {
    "title": "SQLite Datenbank initialisieren",
    "body": "Schema für juristische Dokumente erstellen und FTS5-Index aktivieren.",
    "milestone_name": "Phase 1: PoC Core",
    "labels": ["Datenbank"],
    "due_offset_days": 21
  }
 ]


Bitte generiere nur den JSON-Block.
