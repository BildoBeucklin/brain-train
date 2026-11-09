import datetime
import json
import os
import subprocess
import sys

import requests

# --- CONFIG ---
try:
    remote_url = (
        subprocess.check_output(["git", "config", "--get", "remote.origin.url"])
        .decode("utf-8")
        .strip()
    )
    parts = remote_url.replace(".git", "").split("/")
    REPO_NAME = parts[-1]
    REPO_OWNER = parts[-2]
    GITEA_HOST = "/".join(parts[:-2])
except Exception:
    print("❌ Konnte Git Config nicht lesen. Bitte manuell eingeben.")
    GITEA_HOST = "https://git.rossmann-it-solutions.de"
    REPO_OWNER = input("Repo Owner: ")
    REPO_NAME = input("Repo Name: ")

API_TOKEN = os.environ.get("GITEA_TOKEN")

if not API_TOKEN:
    print("❌ Bitte Token setzen: export GITEA_TOKEN=dein_token")
    print("   Oder in PowerShell: $env:GITEA_TOKEN='dein_token_hier'")
    sys.exit(1)

# Helper: Header setzen
headers = {
    "Authorization": f"token {API_TOKEN}",
    "Content-Type": "application/json",
}


def ensure_milestone(name):
    """Prüft ob Milestone existiert, erstellt ihn sonst und gibt ID zurück."""
    url = f"{GITEA_HOST}/api/v1/repos/{REPO_OWNER}/{REPO_NAME}/milestones"

    # 1. Prüfen ob existiert
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Fehler beim Abrufen von Milestones: {resp.text}")
        return None

    existing = [m for m in resp.json() if m["title"] == name]
    if existing:
        return existing[0]["id"]

    # 2. Erstellen
    data = {"title": name, "state": "open"}
    resp = requests.post(url, headers=headers, json=data)
    if resp.status_code == 201:
        print(f"🏁 Erstellt Milestone: {name}")
        return resp.json()["id"]
    else:
        print(f"❌ Fehler beim Erstellen Milestone '{name}': {resp.text}")
        return None


def ensure_label(name, color="6e0aff"):
    """Prüft ob Label existiert, erstellt es sonst und gibt ID zurück."""
    url = f"{GITEA_HOST}/api/v1/repos/{REPO_OWNER}/{REPO_NAME}/labels"

    # 1. Prüfen
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Fehler beim Abrufen von Labels: {resp.text}")
        return None

    existing = [l for l in resp.json() if l["name"] == name]
    if existing:
        return existing[0]["id"]

    # 2. Erstellen
    data = {"name": name, "color": color}
    resp = requests.post(url, headers=headers, json=data)
    if resp.status_code == 201:
        print(f"🏷️ Erstellt Label: {name}")
        return resp.json()["id"]
    else:
        print(f"❌ Fehler beim Erstellen Label '{name}': {resp.text}")
        return None


def create_issues():
    json_path = os.path.join(os.path.dirname(__file__), "issues.json")

    if not os.path.exists(json_path):
        print(f"❌ Keine 'issues.json' in {json_path} gefunden!")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    print(f"🚀 Importiere {len(tasks)} Tasks nach {REPO_OWNER}/{REPO_NAME}...")

    url = f"{GITEA_HOST}/api/v1/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    today = datetime.date.today()

    # Cache für IDs, um API-Calls zu sparen
    milestone_cache = {}
    label_cache = {}

    for task in tasks:
        # Milestone ID holen oder erstellen
        m_name = task.get("milestone_name")
        m_id = None
        if m_name:
            if m_name not in milestone_cache:
                milestone_cache[m_name] = ensure_milestone(m_name)
            m_id = milestone_cache[m_name]

        # Label IDs holen oder erstellen
        label_ids = []
        for lbl_name in task.get("labels", []):
            if lbl_name not in label_cache:
                label_cache[lbl_name] = ensure_label(lbl_name)
            lid = label_cache[lbl_name]
            if lid:
                label_ids.append(lid)

        # Due Date berechnen
        offset = task.get("due_offset_days", 0)
        due_date = today + datetime.timedelta(days=offset)

        data = {
            "title": task["title"],
            "body": task["body"],
            "labels": label_ids,
            "milestone": m_id,  # Gitea API erwartet hier die ID
            "due_date": due_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        r = requests.post(url, headers=headers, json=data)
        if r.status_code == 201:
            print(f"✅ {task['title']}")
        else:
            print(f"❌ Fehler bei '{task['title']}': {r.text}")


if __name__ == "__main__":
    create_issues()
