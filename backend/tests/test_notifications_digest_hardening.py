from datetime import datetime, timedelta, timezone

import pytest

import server
from services.digest import build_weekly_digest_preview


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDb:
    def __init__(self, existing_id=None):
        self.existing_id = existing_id
        self.calls = 0

    async def execute(self, _query):
        self.calls += 1
        return _ScalarResult(self.existing_id)


@pytest.mark.anyio
@pytest.mark.parametrize(
    "notif_type,title",
    [
        ("project_bookmarked", "Your project was bookmarked"),
        ("match_found", "New matched projects available"),
        ("suggested_collaborator", "Suggested collaborators"),
        ("receipt_issued", "Receipt issued"),
    ],
)
async def test_notification_dedupe_blocks_recent_duplicates(monkeypatch, notif_type, title):
    calls = []

    def _fake_add(_db, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(server, "add_notification", _fake_add)
    fake_db = _FakeDb(existing_id="already-there")

    created = await server._add_notification_if_not_duplicate(
        fake_db,
        user_id="user-1",
        notif_type=notif_type,
        title=title,
        body="body",
        project_id="project-1",
        dedupe_window_minutes=120,
    )
    assert created is False
    assert calls == []


@pytest.mark.anyio
async def test_notification_dedupe_allows_new_notification(monkeypatch):
    calls = []

    def _fake_add(_db, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(server, "add_notification", _fake_add)
    fake_db = _FakeDb(existing_id=None)

    created = await server._add_notification_if_not_duplicate(
        fake_db,
        user_id="user-1",
        notif_type="match_found",
        title="New matched projects available",
        body="body",
        project_id="project-1",
        dedupe_window_minutes=120,
    )
    assert created is True
    assert len(calls) == 1


def test_digest_prefers_high_signal_and_dedupes():
    now = datetime.now(timezone.utc)
    preview = build_weekly_digest_preview(
        active_projects=[
            {"id": "low", "momentum_score": 2, "bookmark_count": 0, "last_activity_at": (now - timedelta(days=20)).isoformat()},
            {"id": "high", "momentum_score": 15, "bookmark_count": 8, "last_activity_at": (now - timedelta(days=1)).isoformat()},
            {"id": "high", "momentum_score": 15, "bookmark_count": 8, "last_activity_at": (now - timedelta(days=1)).isoformat()},
        ],
        open_roles=[],
        trending_builders=[
            {"id": "b2", "momentum_score": 20, "user": {"builder_score": 60}},
            {"id": "b1", "momentum_score": 8, "user": {"builder_score": 30}},
        ],
        milestone_highlights=[],
    )
    assert preview["active_projects"][0]["id"] == "high"
    assert len(preview["active_projects"]) == 2
    assert preview["trending_builders"][0]["id"] == "b2"


def test_digest_sparse_fallback_uses_open_roles_when_projects_empty():
    preview = build_weekly_digest_preview(
        active_projects=[],
        open_roles=[
            {"id": "role-1", "momentum_score": 6},
            {"id": "role-2", "momentum_score": 4},
        ],
        trending_builders=[],
        milestone_highlights=[],
    )
    assert len(preview["active_projects"]) > 0
    assert preview["active_projects"][0]["id"] == "role-1"
