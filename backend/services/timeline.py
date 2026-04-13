from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _parse_iso(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def normalize_timeline_events(
    project: Dict[str, Any],
    updates: List[Dict[str, Any]],
    milestones: List[Dict[str, Any]],
    collaborations: List[Dict[str, Any]],
    repo_sync_at: Optional[str],
) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = [
        {
            "id": f"project_created:{project['id']}",
            "type": "project_created",
            "label": "Project created",
            "timestamp": project.get("created_at"),
            "actor": project.get("owner_name"),
            "metadata": {"stage": project.get("stage")},
        }
    ]

    for update in updates:
        events.append(
            {
                "id": f"update:{update['id']}",
                "type": "update_posted",
                "label": f"Update posted ({update.get('update_type') or 'progress'})",
                "timestamp": update.get("created_at"),
                "actor": update.get("author_name"),
                "metadata": {"title": update.get("title"), "update_type": update.get("update_type")},
            }
        )

    for milestone in milestones:
        events.append(
            {
                "id": f"milestone:{milestone['id']}",
                "type": "milestone_updated",
                "label": f"Milestone {milestone.get('status') or 'updated'}",
                "timestamp": milestone.get("updated_at") or milestone.get("created_at"),
                "actor": milestone.get("creator_name"),
                "metadata": {"title": milestone.get("title"), "status": milestone.get("status")},
            }
        )

    for collab in collaborations:
        if collab.get("status") == "accepted":
            label = "Collaboration accepted"
        elif collab.get("status") == "rejected":
            label = "Collaboration rejected"
        else:
            label = "Collaboration requested"
        events.append(
            {
                "id": f"collab:{collab['id']}",
                "type": "collaboration_event",
                "label": label,
                "timestamp": collab.get("created_at"),
                "actor": collab.get("requester_name"),
                "metadata": {"status": collab.get("status"), "message": collab.get("message")},
            }
        )

    if repo_sync_at:
        events.append(
            {
                "id": f"repo_sync:{project['id']}",
                "type": "repo_sync",
                "label": "Repository synced",
                "timestamp": repo_sync_at,
                "actor": "system",
                "metadata": {},
            }
        )

    if project.get("stage") == "completed":
        events.append(
            {
                "id": f"project_completed:{project['id']}",
                "type": "project_completed",
                "label": "Project completed",
                "timestamp": project.get("updated_at"),
                "actor": project.get("owner_name"),
                "metadata": {},
            }
        )

    return sorted(events, key=lambda item: _parse_iso(item.get("timestamp")), reverse=True)
