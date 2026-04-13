"""In-app notifications: types and helper to enqueue rows on the current SQLAlchemy session."""

from __future__ import annotations

from typing import Optional

from models import Notification

NOTIFICATION_TYPE_COLLABORATION_REQUEST = "collaboration_request"
NOTIFICATION_TYPE_COLLABORATION_DECISION = "collaboration_decision"
NOTIFICATION_TYPE_PROJECT_COMMENT = "project_comment"
NOTIFICATION_TYPE_MILESTONE_COMPLETED = "milestone_completed"
NOTIFICATION_TYPE_PROJECT_UPDATE_POSTED = "project_update_posted"
NOTIFICATION_TYPE_MATCH_FOUND = "match_found"
NOTIFICATION_TYPE_PROJECT_BOOKMARKED = "project_bookmarked"
NOTIFICATION_TYPE_SUGGESTED_COLLABORATOR = "suggested_collaborator"
NOTIFICATION_TYPE_RECEIPT_ISSUED = "receipt_issued"
NOTIFICATION_TYPE_HEALTH_CHANGED = "health_changed"
NOTIFICATION_TYPE_ROLE_FIT_ALERT = "role_fit_alert"


def add_notification(
    session,
    *,
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    project_id: Optional[str] = None,
) -> Notification:
    """Append a notification; caller must commit the session."""
    n = Notification(
        user_id=user_id,
        type=notif_type,
        title=(title or "")[:255],
        body=body or "",
        project_id=project_id,
    )
    session.add(n)
    return n
