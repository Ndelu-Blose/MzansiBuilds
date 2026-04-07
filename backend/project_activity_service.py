from datetime import datetime, timezone


def merge_project_activity(commits: list[dict], updates: list[dict], milestones: list[dict]) -> list[dict]:
    items = []
    for commit in commits:
        items.append(
            {
                "id": f"commit:{commit['id']}",
                "type": "commit",
                "subtype": "repo_commit",
                "title": commit.get("message_headline") or "Commit",
                "body": commit.get("message_body"),
                "actor": commit.get("author_login") or commit.get("author_name"),
                "timestamp": commit.get("committed_at"),
                "metadata": {
                    "sha": commit.get("commit_sha"),
                    "url": commit.get("commit_url"),
                },
            }
        )
    for update in updates:
        items.append(
            {
                "id": f"update:{update['id']}",
                "type": "update",
                "subtype": update.get("update_type"),
                "title": update.get("title"),
                "body": update.get("body"),
                "actor": update.get("author_user_id"),
                "timestamp": update.get("created_at"),
                "metadata": {"update_type": update.get("update_type")},
            }
        )
    for milestone in milestones:
        items.append(
            {
                "id": f"milestone:{milestone['id']}",
                "type": "milestone",
                "subtype": f"status_{milestone.get('status')}",
                "title": milestone.get("title"),
                "body": milestone.get("description"),
                "actor": milestone.get("created_by_user_id"),
                "timestamp": milestone.get("updated_at") or milestone.get("created_at"),
                "metadata": {
                    "status": milestone.get("status"),
                    "due_date": milestone.get("due_date"),
                    "completed_at": milestone.get("completed_at"),
                },
            }
        )
    def parse_dt(value):
        if not value:
            return datetime.min.replace(tzinfo=timezone.utc)
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return sorted(items, key=lambda item: parse_dt(item["timestamp"]), reverse=True)
