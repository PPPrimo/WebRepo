import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
SENSITIVE_DIR = WORKSPACE_DIR / "server" / "sensitive"
SENSITIVE_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = SENSITIVE_DIR / "users.db"
DATABASE_URL = os.getenv("AUTH_DATABASE_URL", f"sqlite+aiosqlite:///{DB_PATH.as_posix()}")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def create_db_and_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session():
    async with async_session_maker() as session:
        yield session

async def close_db():
    await engine.dispose()
