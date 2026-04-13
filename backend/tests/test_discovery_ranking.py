import json
from datetime import datetime, timedelta, timezone

import pytest

import server
from models import Project, ProjectStage, User


class _ScalarRows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _ExecuteResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _ScalarRows(self._rows)


class _FakeDb:
    def __init__(self, rows):
        self._rows = rows
        self._calls = 0

    async def execute(self, _query):
        self._calls += 1
        return _ExecuteResult(self._rows)


def _make_user(user_id: str, name: str) -> User:
    return User(
        id=user_id,
        email=f"{user_id}@example.com",
        name=name,
        username=user_id,
        role="user",
        auth_provider="email",
        created_at=datetime.now(timezone.utc),
    )


def _make_project(
    project_id: str,
    owner: User,
    *,
    title: str,
    stage: ProjectStage,
    tech_stack: list[str],
    roles: list[str],
    updated_at: datetime,
) -> Project:
    p = Project(
        id=project_id,
        user_id=owner.id,
        title=title,
        description=f"{title} description",
        tech_stack=json.dumps(tech_stack),
        stage=stage,
        looking_for_help=True,
        roles_needed_json=json.dumps(roles),
        created_at=updated_at - timedelta(days=7),
        updated_at=updated_at,
    )
    p.user = owner
    return p


@pytest.mark.anyio
async def test_open_roles_filters_and_relative_ordering(monkeypatch):
    now = datetime.now(timezone.utc)
    owner_a = _make_user("owner-a", "Owner A")
    owner_b = _make_user("owner-b", "Owner B")
    owner_c = _make_user("owner-c", "Owner C")
    p_active = _make_project(
        "p-active",
        owner_a,
        title="Active React Role",
        stage=ProjectStage.in_progress,
        tech_stack=["React", "FastAPI"],
        roles=["React Developer"],
        updated_at=now - timedelta(days=1),
    )
    p_quiet = _make_project(
        "p-quiet",
        owner_b,
        title="Quiet Python Role",
        stage=ProjectStage.planning,
        tech_stack=["Python"],
        roles=["Backend Engineer"],
        updated_at=now - timedelta(days=12),
    )
    p_stalled = _make_project(
        "p-stalled",
        owner_c,
        title="Stalled JS Role",
        stage=ProjectStage.in_progress,
        tech_stack=["JavaScript"],
        roles=["Frontend Engineer"],
        updated_at=now - timedelta(days=40),
    )
    fake_db = _FakeDb([p_active, p_quiet, p_stalled])

    async def _bookmark_count_map(_db, _ids):
        return {"p-active": 3, "p-quiet": 1, "p-stalled": 0}

    async def _project_activity_map(_db, _ids):
        return {"p-active": now - timedelta(days=1), "p-quiet": now - timedelta(days=12), "p-stalled": now - timedelta(days=40)}

    async def _compute_user_trust(_db, user_id):
        if user_id == "owner-a":
            return {"builder_score": 72, "builder_score_band": "Momentum Builder"}
        if user_id == "owner-b":
            return {"builder_score": 48, "builder_score_band": "Reliable Collaborator"}
        return {"builder_score": 18, "builder_score_band": "New Builder"}

    monkeypatch.setattr(server, "_bookmark_count_map", _bookmark_count_map)
    monkeypatch.setattr(server, "_project_activity_map", _project_activity_map)
    monkeypatch.setattr(server, "_compute_user_trust", _compute_user_trust)

    all_rows = await server.get_open_roles(limit=10, offset=0, db=fake_db)
    ids = [item["id"] for item in all_rows["items"]]
    assert ids.index("p-active") < ids.index("p-stalled")

    stage_filtered = await server.get_open_roles(stage="planning", limit=10, offset=0, db=fake_db)
    assert [item["id"] for item in stage_filtered["items"]] == ["p-quiet"]

    tech_filtered = await server.get_open_roles(tech="react", limit=10, offset=0, db=fake_db)
    assert [item["id"] for item in tech_filtered["items"]] == ["p-active"]

    health_filtered = await server.get_open_roles(health_status="stalled", limit=10, offset=0, db=fake_db)
    assert [item["id"] for item in health_filtered["items"]] == ["p-stalled"]

    activity_filtered = await server.get_open_roles(activity_window_days=7, limit=10, offset=0, db=fake_db)
    assert [item["id"] for item in activity_filtered["items"]] == ["p-active"]

    score_band_filtered = await server.get_open_roles(owner_score_band="Momentum Builder", limit=10, offset=0, db=fake_db)
    assert [item["id"] for item in score_band_filtered["items"]] == ["p-active"]


@pytest.mark.anyio
async def test_trending_projects_relative_ordering(monkeypatch):
    now = datetime.now(timezone.utc)
    owner_a = _make_user("owner-a", "Owner A")
    owner_b = _make_user("owner-b", "Owner B")
    p_high = _make_project(
        "p-high",
        owner_a,
        title="High Momentum",
        stage=ProjectStage.in_progress,
        tech_stack=["React"],
        roles=["Fullstack"],
        updated_at=now - timedelta(days=1),
    )
    p_low = _make_project(
        "p-low",
        owner_b,
        title="Low Momentum",
        stage=ProjectStage.planning,
        tech_stack=["Python"],
        roles=["Backend"],
        updated_at=now - timedelta(days=35),
    )
    fake_db = _FakeDb([p_high, p_low])

    async def _bookmark_count_map(_db, _ids):
        return {"p-high": 5, "p-low": 0}

    async def _project_activity_map(_db, _ids):
        return {"p-high": now - timedelta(days=1), "p-low": now - timedelta(days=35)}

    async def _compute_user_trust(_db, user_id):
        return {"builder_score": 80 if user_id == "owner-a" else 20, "builder_score_band": "Momentum Builder" if user_id == "owner-a" else "New Builder"}

    monkeypatch.setattr(server, "_bookmark_count_map", _bookmark_count_map)
    monkeypatch.setattr(server, "_project_activity_map", _project_activity_map)
    monkeypatch.setattr(server, "_compute_user_trust", _compute_user_trust)

    payload = await server.get_trending_projects(limit=10, db=fake_db)
    ids = [item["id"] for item in payload["items"]]
    assert ids[0] == "p-high"


@pytest.mark.anyio
async def test_trending_builders_relative_ordering(monkeypatch):
    now = datetime.now(timezone.utc)
    top = _make_user("top-builder", "Top Builder")
    new = _make_user("new-builder", "New Builder")
    fake_db = _FakeDb([top, new])

    async def _compute_user_trust(_db, user_id):
        if user_id == "top-builder":
            return {
                "builder_score": 75,
                "receipts_count": 3,
                "builder_score_band": "Momentum Builder",
                "completed_projects_count": 2,
                "last_active_at": (now - timedelta(days=1)).isoformat(),
            }
        return {
            "builder_score": 20,
            "receipts_count": 0,
            "builder_score_band": "New Builder",
            "completed_projects_count": 0,
            "last_active_at": (now - timedelta(days=35)).isoformat(),
        }

    monkeypatch.setattr(server, "_compute_user_trust", _compute_user_trust)

    payload = await server.get_trending_builders(limit=10, db=fake_db)
    ids = [item["user"]["id"] for item in payload["items"]]
    assert ids[0] == "top-builder"
