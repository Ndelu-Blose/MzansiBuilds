from datetime import datetime, timedelta, timezone
from typing import Optional


def compute_project_health(stage: Optional[str], last_activity_at: Optional[datetime]) -> str:
    if (stage or "").lower() == "completed":
        return "completed"

    if not last_activity_at:
        return "stalled"

    now = datetime.now(timezone.utc)
    candidate = last_activity_at
    if candidate.tzinfo is None:
        candidate = candidate.replace(tzinfo=timezone.utc)
    age = now - candidate

    if age <= timedelta(days=7):
        return "active"
    if age <= timedelta(days=21):
        return "quiet"
    return "stalled"
