# Database configuration for Supabase PostgreSQL
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

load_dotenv(Path(__file__).parent / '.env', override=True)

_raw_db = os.environ.get('DATABASE_URL') or ''
if _raw_db.startswith('postgres://'):
    _raw_db = 'postgresql://' + _raw_db[len('postgres://') :]
DATABASE_URL = _raw_db or None
ASYNC_DATABASE_URL = (DATABASE_URL or '').replace('postgresql://', 'postgresql+asyncpg://')

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=False,
    echo=False,
    connect_args={
        "statement_cache_size": 0,  # CRITICAL: Required for transaction pooler
        "command_timeout": 30,
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
