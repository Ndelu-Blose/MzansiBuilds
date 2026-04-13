import json
from datetime import datetime, timezone

import pytest

import server
from models import Profile, Project, ProjectStage, User


class _ScalarRows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _ExecuteResult:
    def __init__(self, *, scalar_one=None, scalar=None, rows=None):
        self._scalar_one = scalar_one
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar_one

    def scalar(self):
        return self._scalar

    def scalars(self):
        return _ScalarRows(self._rows)


class _FakeDb:
    def __init__(self, queue):
        self._queue = list(queue)

    async def execute(self, _query):
        if not self._queue:
            raise AssertionError("Unexpected extra execute call")
        return self._queue.pop(0)


def _user():
    return User(
        id="user-1",
        email="user@example.com",
        name="User One",
        role="user",
        auth_provider="email",
        created_at=datetime.now(timezone.utc),
    )


@pytest.mark.anyio
async def test_activation_checklist_profile_and_owner_gaps():
    user = _user()
    profile = Profile(user_id=user.id, skills=json.dumps([]), bio="", headline="")
    project = Project(
        id="proj-1",
        user_id=user.id,
        title="Project",
        stage=ProjectStage.in_progress,
        looking_for_help=True,
        roles_needed_json=json.dumps([]),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db = _FakeDb(
        [
            _ExecuteResult(scalar_one=profile),
            _ExecuteResult(rows=[project]),
            _ExecuteResult(scalar=0),
            _ExecuteResult(scalar=0),
        ]
    )
    payload = await server._build_activation_checklist(db, user)
    assert any(item["id"] == "add-skills" for item in payload["profile_items"])
    assert any(item["id"] == "add-roles-needed" for item in payload["owner_items"])
    assert len(payload["top_items"]) <= 2


@pytest.mark.anyio
async def test_activation_checklist_no_gaps_returns_empty_lists():
    user = _user()
    profile = Profile(user_id=user.id, skills=json.dumps(["React"]), bio="Builder", headline="Engineer")
    db = _FakeDb(
        [
            _ExecuteResult(scalar_one=profile),
            _ExecuteResult(rows=[]),
        ]
    )
    payload = await server._build_activation_checklist(db, user)
    assert payload["profile_items"] == []
    assert payload["owner_items"] == []
