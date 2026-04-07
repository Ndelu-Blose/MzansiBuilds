from datetime import datetime, timedelta, timezone

from oauth_state_service import oauth_state_error


class DummyState:
    def __init__(self, expires_at, used_at=None):
        self.expires_at = expires_at
        self.used_at = used_at


def test_valid_state():
    now = datetime.now(timezone.utc)
    state = DummyState(expires_at=now + timedelta(minutes=5))
    assert oauth_state_error(state, now) is None


def test_missing_state():
    now = datetime.now(timezone.utc)
    assert oauth_state_error(None, now) == "invalid"


def test_expired_state():
    now = datetime.now(timezone.utc)
    state = DummyState(expires_at=now - timedelta(seconds=1))
    assert oauth_state_error(state, now) == "expired"


def test_reused_state():
    now = datetime.now(timezone.utc)
    state = DummyState(expires_at=now + timedelta(minutes=5), used_at=now)
    assert oauth_state_error(state, now) == "reused"


def test_invalid_state():
    now = datetime.now(timezone.utc)
    assert oauth_state_error(None, now) == "invalid"
