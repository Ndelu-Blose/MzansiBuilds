from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from github_oauth_service import hash_state
from models import ConnectedProvider, OAuthState


STATE_TTL_MINUTES = 10


def oauth_state_error(record: Optional[OAuthState], now: datetime) -> Optional[str]:
    if not record:
        return "invalid"
    if record.used_at is not None:
        return "reused"
    if record.expires_at <= now:
        return "expired"
    return None


async def create_oauth_state(db: AsyncSession, raw_state: str, user_id: str, provider: ConnectedProvider) -> OAuthState:
    now = datetime.now(timezone.utc)
    await cleanup_expired_states(db)
    state = OAuthState(
        state_hash=hash_state(raw_state),
        user_id=user_id,
        provider=provider,
        created_at=now,
        expires_at=now + timedelta(minutes=STATE_TTL_MINUTES),
    )
    db.add(state)
    await db.commit()
    await db.refresh(state)
    return state


async def validate_oauth_state(db: AsyncSession, raw_state: str, provider: ConnectedProvider) -> OAuthState:
    now = datetime.now(timezone.utc)
    state_hash = hash_state(raw_state)
    result = await db.execute(
        select(OAuthState).where(
            OAuthState.state_hash == state_hash,
            OAuthState.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    err = oauth_state_error(record, now)
    if err:
        raise ValueError(err)
    return record


async def mark_oauth_state_used(db: AsyncSession, state_id: str) -> None:
    result = await db.execute(select(OAuthState).where(OAuthState.id == state_id))
    record = result.scalar_one_or_none()
    if not record:
        return
    record.used_at = datetime.now(timezone.utc)
    await db.commit()


async def cleanup_expired_states(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    await db.execute(delete(OAuthState).where(OAuthState.expires_at < now))
    await db.commit()
