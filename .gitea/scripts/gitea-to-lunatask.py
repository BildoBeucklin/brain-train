import os
import requests

# --- KONFIGURATION & UMGEBUNGSVARIABLEN ---
GITEA_TOKEN = os.environ.get("API_TOKEN")
GITEA_URL = "https://git.rossmann-it-solutions.de"
FULL_REPO = os.environ.get("GITHUB_REPOSITORY")

LUNATASK_API_TOKEN = os.environ.get("LUNATASK_API_TOKEN")
LUNATASK_AREA_ID = os.environ.get("LUNATASK_AREA_ID")
LUNATASK_GOAL_ID = os.environ.get("LUNATASK_GOAL_ID")

LUNATASK_API_URL = "https://api.lunatask.app/v1/tasks"

# Lunatask API Error Codes
LUNATASK_ERRORS = {
    400: "Bad Request -- Provided parameters are invalid, malformed, or missing.",
    401: "Unauthorized -- Your access token is missing, is wrong, or was revoked.",
    402: "Limit Reached on Free Plan -- A subscription is required to continue.",
    404: "Not Found -- The specified entity couldn’t be found.",
    422: "Unprocessable Entity -- The provided entity isn’t valid. Check what data you’re sending.",
    500: "Internal Server Error -- We encountered a problem processing your request and have been notified. Please, try again later. If the problem persists, please [contact us](https://lunatask.app/contact).",
    503: "Service Unavailable -- We’re temporarily offline for maintenance. Please, try again later.",
    524: "Request Timed Out -- Please, try again.",
}


def get_gitea_issues():
    if not FULL_REPO:
        print("⚠️ GITHUB_REPOSITORY ist nicht gesetzt.")
        return []

    repo_owner, repo_name = FULL_REPO.split("/")
    headers = {"Authorization": f"token {GITEA_TOKEN}"}
    url = f"{GITEA_URL}/api/v1/repos/{repo_owner}/{repo_name}/issues"

    response = requests.get(url, headers=headers, params={"state": "open", "limit": 200})
    if response.status_code != 200:
        print(f"❌ Fehler beim Abrufen der Gitea Issues: {response.status_code}")
        return []
    return response.json()


def get_lunatask_headers():
    return {
        "Authorization": f"Bearer {LUNATASK_API_TOKEN}",
        "Content-Type": "application/json",
    }


def get_lunatask_task(task_id):
    """
    Ruft einen spezifischen Task über seine ID aus Lunatask ab.
    GET https://api.lunatask.app/v1/tasks/<id>
    """
    if not LUNATASK_API_TOKEN:
        print("⚠️ LUNATASK_API_TOKEN ist nicht gesetzt.")
        return None

    url = f"{LUNATASK_API_URL}/{task_id}"
    res = requests.get(url, headers=get_lunatask_headers())

    if res.status_code == 200:
        return res.json().get("task")
    else:
        error_desc = LUNATASK_ERRORS.get(res.status_code)
        error_detail = f" ({error_desc})" if error_desc else ""
        print(f"❌ Fehler beim Abrufen des Tasks {task_id}: HTTP {res.status_code}{error_detail} - {res.text}")
        return None


def get_lunatask_tasks(source="gitea", source_id=None):
    """
    Ruft Tasks aus Lunatask ab, optional gefiltert nach source und source_id.
    GET https://api.lunatask.app/v1/tasks
    """
    if not LUNATASK_API_TOKEN:
        return []

    params = {}
    if source:
        params["source"] = source
    if source_id:
        params["source_id"] = source_id

    res = requests.get(LUNATASK_API_URL, headers=get_lunatask_headers(), params=params)
    if res.status_code == 200:
        return res.json().get("tasks", [])
    else:
        error_desc = LUNATASK_ERRORS.get(res.status_code)
        error_detail = f" ({error_desc})" if error_desc else ""
        print(f"❌ Fehler beim Abrufen der Lunatask Tasks: HTTP {res.status_code}{error_detail} - {res.text}")
        return []


def update_lunatask_task(task_id, payload):
    """
    Aktualisiert einen existierenden Task in Lunatask.
    PUT https://api.lunatask.app/v1/tasks/<id>
    """
    url = f"{LUNATASK_API_URL}/{task_id}"
    return requests.put(url, headers=get_lunatask_headers(), json=payload)


def extract_issue_number(source_id):
    """
    Extrahiert die Issue-Nummer aus einem source_id-String (z.B. 'gitea-issue-42' -> 42).
    """
    if not source_id:
        return None
    if source_id.startswith("gitea-issue-"):
        num_str = source_id.replace("gitea-issue-", "")
        if num_str.isdigit():
            return int(num_str)
    return None


def close_gitea_issue(issue_number):
    """
    Schließt ein Gitea Issue über die Gitea REST API.
    PATCH /api/v1/repos/{owner}/{repo}/issues/{index}
    """
    if not FULL_REPO or not GITEA_TOKEN:
        print("⚠️ GITHUB_REPOSITORY oder API_TOKEN ist nicht gesetzt.")
        return False

    repo_owner, repo_name = FULL_REPO.split("/")
    headers = {
        "Authorization": f"token {GITEA_TOKEN}",
        "Content-Type": "application/json",
    }
    url = f"{GITEA_URL}/api/v1/repos/{repo_owner}/{repo_name}/issues/{issue_number}"
    res = requests.patch(url, headers=headers, json={"state": "closed"})

    if 200 <= res.status_code < 300:
        print(f"🔒 Issue #{issue_number} in Gitea geschlossen (in Lunatask als 'completed' markiert)")
        return True
    else:
        print(f"❌ Fehler beim Schließen von Gitea Issue #{issue_number}: HTTP {res.status_code} - {res.text}")
        return False


def sync_to_lunatask():
    if not LUNATASK_API_TOKEN or not LUNATASK_AREA_ID:
        print("ℹ️ LUNATASK_API_TOKEN oder LUNATASK_AREA_ID nicht gesetzt. Lunatask Sync wird übersprungen.")
        return

    issues = get_gitea_issues()
    open_issues_map = {issue["number"]: issue for issue in issues if "number" in issue}

    # Bereits vorhandene Gitea Tasks aus Lunatask abrufen
    existing_tasks = get_lunatask_tasks(source="gitea")
    existing_map = {}
    closed_in_gitea_count = 0

    # 1. Sync: Lunatask -> Gitea (Erledigte Tasks in Gitea schließen)
    for task in existing_tasks:
        is_completed = (task.get("status") == "completed") or (task.get("completed_at") is not None)
        for s in task.get("sources", []):
            if s.get("source") == "gitea" and s.get("source_id"):
                source_id = s["source_id"]
                existing_map[source_id] = task

                issue_num = extract_issue_number(source_id)
                if issue_num and is_completed and issue_num in open_issues_map:
                    if close_gitea_issue(issue_num):
                        closed_in_gitea_count += 1
                        del open_issues_map[issue_num]

    if not open_issues_map:
        if closed_in_gitea_count > 0:
            print(f"🎉 Sync abgeschlossen: {closed_in_gitea_count} Issues in Gitea geschlossen. Keine weiteren offenen Issues zu synchronisieren.")
        else:
            print("ℹ️ Keine offenen Issues zum Synchronisieren gefunden.")
        return

    created_count = 0
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    # 2. Sync: Gitea -> Lunatask (Verbleibende offene Issues anlegen / aktualisieren)
    for number, issue in open_issues_map.items():
        title = issue.get("title", "Unbenanntes Issue")
        html_url = issue.get("html_url", "")
        body = issue.get("body", "") or ""
        due_date = issue.get("due_date")
        source_id = f"gitea-issue-{number}"

        # Note-Feld zusammensetzen
        note_content = f"**Gitea Issue #{number}**: [{title}]({html_url})\n\n{body}".strip()

        # Prüfen, ob der Task bereits in Lunatask existiert
        existing_task_meta = existing_map.get(source_id)

        if existing_task_meta:
            task_id = existing_task_meta["id"]
            # Task per ID abrufen (Retrieve task endpoint: GET /v1/tasks/<id>)
            current_task = get_lunatask_task(task_id)

            update_payload = {
                "name": f"{title} (#{number})",
                "note": note_content,
            }
            if LUNATASK_GOAL_ID:
                update_payload["goal_id"] = LUNATASK_GOAL_ID
            if due_date:
                update_payload["scheduled_on"] = due_date[:10]

            res = update_lunatask_task(task_id, update_payload)

            if 200 <= res.status_code < 300:
                updated_count += 1
                print(f"🔄 Updated Task für Issue #{number} -> Lunatask (ID: {task_id}, HTTP {res.status_code})")
            else:
                failed_count += 1
                error_desc = LUNATASK_ERRORS.get(res.status_code)
                error_detail = f" ({error_desc})" if error_desc else ""
                print(f"❌ Fehler beim Aktualisieren von Issue #{number}: HTTP {res.status_code}{error_detail} - {res.text}")
                if res.status_code in (401, 402):
                    print(f"🛑 Abbruch: Weiterer Sync gestoppt ({error_desc})")
                    break
        else:
            # Task existiert noch nicht -> Neu anlegen (POST /v1/tasks)
            payload = {
                "area_id": LUNATASK_AREA_ID,
                "name": f"{title} (#{number})",
                "note": note_content,
                "source": "gitea",
                "source_id": source_id,
            }
            if LUNATASK_GOAL_ID:
                payload["goal_id"] = LUNATASK_GOAL_ID
            if due_date:
                payload["scheduled_on"] = due_date[:10]

            res = requests.post(LUNATASK_API_URL, headers=get_lunatask_headers(), json=payload)

            if res.status_code == 201:
                created_count += 1
                print(f"✅ Created Issue #{number} -> Lunatask (HTTP {res.status_code})")
            elif res.status_code == 204:
                # 204 No Content: Task existiert bereits in Lunatask (kein Duplikat erstellt)
                skipped_count += 1
                print(f"ℹ️ Issue #{number} existiert bereits in Lunatask (HTTP 204 No Content - kein Duplikat)")
            elif 200 <= res.status_code < 300:
                created_count += 1
                print(f"✅ Synced Issue #{number} -> Lunatask (HTTP {res.status_code})")
            else:
                failed_count += 1
                error_desc = LUNATASK_ERRORS.get(res.status_code)
                error_detail = f" ({error_desc})" if error_desc else ""
                print(f"❌ Fehler bei Issue #{number}: HTTP {res.status_code}{error_detail} - {res.text}")
                if res.status_code in (401, 402):
                    print(f"🛑 Abbruch: Weiterer Sync gestoppt ({error_desc})")
                    break

    print(f"🎉 Sync abgeschlossen: {created_count} neu erstellt, {updated_count} aktualisiert, {closed_in_gitea_count} in Gitea geschlossen, {skipped_count} unverändert, {failed_count} fehlerhaft.")


if __name__ == "__main__":
    sync_to_lunatask()
