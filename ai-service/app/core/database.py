import logging
from collections.abc import AsyncGenerator

import asyncpg

from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError

logger = logging.getLogger("sciresearch-ai.database")

_pool: asyncpg.Pool | None = None


async def init_db_pool() -> asyncpg.Pool | None:
    """Initialize the global asyncpg connection pool."""
    global _pool

    settings = get_settings()
    db_url = settings.effective_database_url

    if not db_url:
        logger.warning("DATABASE_URL is not configured; database operations will fail.")
        return None

    if _pool is not None:
        return _pool

    try:
        max_size = 3 if settings.ENVIRONMENT == "test" else 10
        _pool = await asyncpg.create_pool(
            dsn=db_url,
            min_size=1,
            max_size=max_size,
            timeout=10.0,
            command_timeout=30.0,
        )
        logger.info("PostgreSQL connection pool initialized successfully.")
        return _pool
    except Exception as exc:
        logger.error("Failed to initialize PostgreSQL pool: %s", exc)
        raise ServiceUnavailableError(
            message="Failed to connect to the database",
            code="DATABASE_CONNECTION_ERROR",
        ) from exc


async def close_db_pool() -> None:
    """Gracefully terminate all connections in the database pool."""
    global _pool

    if _pool is not None:
        logger.info("Closing PostgreSQL connection pool...")
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed.")


def get_db_pool() -> asyncpg.Pool:
    """Retrieve the active asyncpg connection pool."""
    if _pool is None:
        raise ServiceUnavailableError(
            message="Database connection pool is not initialized",
            code="DATABASE_UNAVAILABLE",
        )
    return _pool


async def check_database_connection() -> bool:
    """Probe the database connection by executing a lightweight query."""
    pool = get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.fetchval("SELECT 1")
        return result == 1


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency to acquire a single connection from the pool."""
    pool = get_db_pool()
    async with pool.acquire() as connection:
        yield connection
