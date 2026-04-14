import pytest

import server
from models import DigestPreference
from schemas import DigestPreferenceUpdate
from pydantic import ValidationError


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDb:
    def __init__(self, existing_pref=None):
        self.existing_pref = existing_pref
        self.added = []
        self.commits = 0

    async def execute(self, _query):
        return _ScalarResult(self.existing_pref)

    def add(self, obj):
        self.added.append(obj)
        self.existing_pref = obj

    async def commit(self):
        self.commits += 1


class _User:
    def __init__(self, user_id):
        self.id = user_id


class _RowsResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _FakeReadAllDb:
    def __init__(self, rows):
        self.rows = rows
        self.commits = 0

    async def execute(self, _query):
        return _RowsResult(self.rows)

    async def commit(self):
        self.commits += 1


@pytest.mark.anyio
async def test_get_digest_preferences_returns_defaults_when_missing():
    db = _FakeDb(existing_pref=None)
    user = _User("user-1")

    result = await server.get_digest_preferences(user=user, db=db)

    assert result["user_id"] == "user-1"
    assert result["frequency"] == "weekly"
    assert result["channels"] == ["email_digest", "comment_emails"]


@pytest.mark.anyio
async def test_put_digest_preferences_creates_and_returns_typed_shape():
    db = _FakeDb(existing_pref=None)
    user = _User("user-2")
    payload = DigestPreferenceUpdate(
        frequency="weekly",
        channels=["comment_emails"],
    )

    result = await server.update_digest_preferences(payload=payload, user=user, db=db)

    assert db.commits == 1
    assert len(db.added) == 1
    assert result["user_id"] == "user-2"
    assert result["frequency"] == "weekly"
    assert result["channels"] == ["comment_emails"]


@pytest.mark.anyio
async def test_get_digest_preferences_returns_stored_channels():
    existing = DigestPreference(
        user_id="user-3",
        enabled=True,
        frequency="weekly",
        channels_json='["email_digest"]',
    )
    db = _FakeDb(existing_pref=existing)
    user = _User("user-3")

    result = await server.get_digest_preferences(user=user, db=db)

    assert result["user_id"] == "user-3"
    assert result["frequency"] == "weekly"
    assert result["channels"] == ["email_digest"]


def test_digest_preference_update_rejects_invalid_frequency():
    with pytest.raises(ValidationError):
        DigestPreferenceUpdate(frequency="daily", channels=["email_digest"])


def test_digest_preference_update_rejects_invalid_channel():
    with pytest.raises(ValidationError):
        DigestPreferenceUpdate(frequency="weekly", channels=["email_digest", "sms"])


@pytest.mark.anyio
async def test_mark_all_notifications_read_updates_all_unread():
    class _Notification:
        def __init__(self):
            self.read_at = None

    rows = [_Notification(), _Notification(), _Notification()]
    db = _FakeReadAllDb(rows)
    user = _User("u-notif")

    result = await server.mark_all_notifications_read(user=user, db=db)

    assert result["updated"] == 3
    assert db.commits == 1
    assert all(row.read_at is not None for row in rows)
