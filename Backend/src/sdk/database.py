# ═══════════════════════════════════════════════════════════════
# fte_sdk / database.py
#
# PURPOSE: SQLAlchemy async engine setup + session management.
#          Har agent apna DB session yahin se leta hai.
#          init_db() tables create karta hai startup pe.
#
# USED BY: ALL agents + backend
# EXPORTS: engine, async_session_factory, get_db(), init_db(), Base
# ═══════════════════════════════════════════════════════════════

import ssl
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from src.sdk.config import get_settings

settings = get_settings()

import os
# ─── Engine (Async) ───────────────────────────────────────────
# Clean and normalize Database URL for asyncpg + Neon or testing
if os.getenv("TESTING") == "true":
    db_url = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///test_autofte.db")
    connect_args = {}
else:
    db_url = settings.DATABASE_URL
    if "?" in db_url:
        # strip query params like ?sslmode=require&channel_binding=require which asyncpg rejects
        db_url = db_url.split("?")[0]

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Configure SSL context for Neon/cloud PostgreSQL if not local or Docker container
    connect_args = {}
    is_local_db = any(h in db_url for h in ["localhost", "127.0.0.1", "@postgres", "@db"])
    if "asyncpg" in db_url and not is_local_db and ("neon.tech" in db_url or "ssl" in settings.DATABASE_URL.lower()):
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    **({"pool_size": 10, "max_overflow": 20} if "sqlite" not in db_url else {})
)

# ─── Session Factory ──────────────────────────────────────────
# Creates new AsyncSession instances. expire_on_commit=False
# lets us access model attributes after commit.

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
AsyncSessionLocal = async_session_factory


# ─── Base (Declarative Base) ──────────────────────────────────
# All ORM models inherit from this. SQLAlchemy uses this to
# discover tables for CREATE TABLE / migrations.

class Base(DeclarativeBase):
    pass


# ─── get_db() (FastAPI Dependency) ────────────────────────────
# Usage in FastAPI: `async def handler(db: AsyncSession = Depends(get_db))`
# Yields a session, auto-closes on request completion.

async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── init_db() (Startup) ──────────────────────────────────────
# Creates all tables defined in models. Called on service startup.
# In production, use Alembic migrations instead.

async def init_db():
    # Ensure all models are registered with Base.metadata before creating tables
    import src.sdk.models  # noqa: F401
    import src.domains.auth.models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure new columns on automation_settings exist in PostgreSQL
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS autopilot_interval_hours INTEGER DEFAULT 6;"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS safety_delay_minutes INTEGER DEFAULT 15;"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS is_autopilot_enabled BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS operating_start_time VARCHAR(10) DEFAULT '09:00';"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS operating_end_time VARCHAR(10) DEFAULT '23:00';"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS start_date VARCHAR(20) DEFAULT '';"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS end_date VARCHAR(20) DEFAULT '';"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS operating_days VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun';"))
            await conn.execute(text("ALTER TABLE automation_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Karachi';"))
        except Exception:
            pass
        # Customer-support chat sessions (create_all does not alter existing tables)
        for stmt in (
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);",
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT '';",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_conversations_session_id ON conversations (session_id);",
        ):
            try:
                if engine.dialect.name == "postgresql":
                    from sqlalchemy import text
                    await conn.execute(text(stmt))
            except Exception:
                pass
