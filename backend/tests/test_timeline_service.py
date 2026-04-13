from services.timeline import normalize_timeline_events


def test_timeline_includes_project_created_when_empty():
    items = normalize_timeline_events(
        project={"id": "p1", "created_at": "2026-01-01T00:00:00+00:00", "updated_at": None, "stage": "idea", "owner_name": "Owner"},
        updates=[],
        milestones=[],
        collaborations=[],
        repo_sync_at=None,
    )
    assert len(items) >= 1
    assert any(item["type"] == "project_created" for item in items)


def test_timeline_sorts_descending():
    items = normalize_timeline_events(
        project={"id": "p1", "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-10T00:00:00+00:00", "stage": "completed", "owner_name": "Owner"},
        updates=[{"id": "u1", "title": "Update", "update_type": "progress", "created_at": "2026-01-05T00:00:00+00:00", "author_name": "Owner"}],
        milestones=[],
        collaborations=[],
        repo_sync_at="2026-01-08T00:00:00+00:00",
    )
    timestamps = [item["timestamp"] for item in items if item.get("timestamp")]
    assert timestamps == sorted(timestamps, reverse=True)
