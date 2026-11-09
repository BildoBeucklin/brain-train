import datetime
import os

import requests

# --- KONFIGURATION (Automatisch) ---
OUTPUT_FILE = "PLAN.md"
API_TOKEN = os.environ.get("API_TOKEN")
GITEA_URL = "https://git.rossmann-it-solutions.de"
full_repo = os.environ.get("GITHUB_REPOSITORY")

if full_repo:
    REPO_OWNER, REPO_NAME = full_repo.split("/")
    print(f"🤖 Automatik-Modus: {REPO_OWNER} / {REPO_NAME}")
else:
    # Fallback, falls du das Skript lokal auf deinem PC testest
    # HIER BITTE DEINE ECHTEN DATEN EINTRAGEN:
    REPO_OWNER = "ris-konstantinr"  # z.B. admin oder rossmann
    REPO_NAME = "-"  # z.B. website


# --- API HELPER ---
def get_data(endpoint, params=None):
    headers = {"Authorization": f"token {API_TOKEN}"}
    url = f"{GITEA_URL}/api/v1/repos/{REPO_OWNER}/{REPO_NAME}/{endpoint}"
    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        print(f"❌ Fehler bei {endpoint}: {response.status_code}")
        return []
    return response.json()


def generate_mermaid():
    # 1. Daten holen
    issues = get_data("issues", params={"state": "open", "limit": 200})
    milestones = get_data("milestones", params={"state": "open"})

    if not issues:
        print("Keine Issues gefunden.")
        return None

    # 2. Issues nach Meilenstein gruppieren
    # Struktur: { milestone_id: [issue1, issue2], 'none': [issue3] }
    grouped_issues = {"none": []}

    # Dictionary für Meilenstein-Namen (ID -> Name)
    ms_map = {}

    for ms in milestones:
        ms_id = ms["id"]
        grouped_issues[ms_id] = []
        ms_map[ms_id] = ms

    for issue in issues:
        ms = issue.get("milestone")
        if ms:
            ms_id = ms["id"]
            # Falls Meilenstein existiert (und nicht geschlossen/versteckt ist)
            if ms_id in grouped_issues:
                grouped_issues[ms_id].append(issue)
            else:
                grouped_issues["none"].append(issue)
        else:
            grouped_issues["none"].append(issue)

    # 3. Mermaid generieren
    content = [
        "```mermaid",
        "gantt",
        "    dateFormat  YYYY-MM-DD",
        "    axisFormat  %d.%m.",
        "    title Roadmap & Meilensteine",
    ]

    today = datetime.date.today()

    # A) Zuerst die Meilensteine durchgehen
    for ms in milestones:
        ms_title = ms["title"].replace(":", "-").replace("#", "")
        ms_id = ms["id"]
        ms_issues = grouped_issues[ms_id]

        # Wenn Meilenstein keine Issues hat, überspringen?
        # Nein, zeigen wir ihn trotzdem als Abschnitt an!
        content.append(f"    section {ms_title}")

        # Optional: Den Meilenstein selbst als Balken anzeigen (wenn er ein Datum hat)
        if ms.get("due_on"):
            due = ms["due_on"][:10]
            # Ein Meilenstein-Marker in Mermaid
            content.append(f"    🏁 Deadline {ms_title} : milestone, {due}, 0d")

        # Jetzt die Tasks dieses Meilensteins
        for issue in ms_issues:
            line = format_issue_line(issue)
            content.append(line)

    # B) Dann die Issues OHNE Meilenstein
    if grouped_issues["none"]:
        content.append("    section Backlog / Ohne Zuordnung")
        for issue in grouped_issues["none"]:
            line = format_issue_line(issue)
            content.append(line)

    content.append("```")
    return "\n".join(content)


def format_issue_line(issue):
    title = issue["title"].replace(":", "-").replace("#", "")
    number = issue["number"]
    created_at = issue["created_at"][:10]
    due_date = issue.get("due_date")

    if due_date:
        return f"    {title} (#{number}) : {created_at}, {due_date[:10]}"
    else:
        # Standard: 2 Tage Dauer ab Erstellung
        return f"    {title} (#{number}) : {created_at}, 2d"


if __name__ == "__main__":
    chart = generate_mermaid()
    if chart:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            # Falls du PLAN.md nutzt:
            f.write("# 📅 Projekt-Plan\n\n")
            f.write(chart)

            # Falls du README injection nutzt, müsstest du hier die inject-Funktion von vorhin nehmen
        print(f"✅ {OUTPUT_FILE} mit Meilensteinen aktualisiert!")
