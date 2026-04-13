from datetime import datetime, timedelta, timezone

from services.health import compute_project_health


def test_completed_project_always_completed():
    assert compute_project_health("completed", None) == "completed"


def test_active_project_recent_activity():
    last_activity = datetime.now(timezone.utc) - timedelta(days=2)
    assert compute_project_health("in_progress", last_activity) == "active"


def test_quiet_project_mid_activity_window():
    last_activity = datetime.now(timezone.utc) - timedelta(days=12)
    assert compute_project_health("planning", last_activity) == "quiet"


def test_stalled_project_old_activity():
    last_activity = datetime.now(timezone.utc) - timedelta(days=30)
    assert compute_project_health("in_progress", last_activity) == "stalled"
