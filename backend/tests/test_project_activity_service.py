from project_activity_service import merge_project_activity


def test_merge_project_activity_sorted_and_shaped():
    commits = [
        {
            "id": "c1",
            "commit_sha": "abc123",
            "author_login": "dev1",
            "author_name": "Dev One",
            "message_headline": "feat: add api",
            "message_body": "",
            "committed_at": "2026-04-07T10:00:00+00:00",
            "commit_url": "https://example.com/commit/abc123",
        }
    ]
    updates = [
        {
            "id": "u1",
            "author_user_id": "user-1",
            "title": "Progress update",
            "body": "Implemented endpoint",
            "update_type": "progress",
            "created_at": "2026-04-07T11:00:00+00:00",
        }
    ]
    milestones = [
        {
            "id": "m1",
            "created_by_user_id": "user-1",
            "title": "MVP",
            "description": "Ship MVP",
            "status": "done",
            "due_date": None,
            "completed_at": "2026-04-07T12:00:00+00:00",
            "created_at": "2026-04-07T09:00:00+00:00",
            "updated_at": "2026-04-07T12:00:00+00:00",
        }
    ]

    items = merge_project_activity(commits, updates, milestones)
    assert len(items) == 3
    assert items[0]["type"] == "milestone"
    assert items[1]["type"] == "update"
    assert items[2]["type"] == "commit"
    assert {"id", "type", "subtype", "title", "body", "actor", "timestamp", "metadata"} <= set(items[0].keys())
