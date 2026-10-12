import logging
from contextlib import asynccontextmanager

import app.core.network  # noqa: F401 - ensure IPv4 precedence on Windows
from fastapi import FastAPI, status

from app.api.research import router as research_router
from app.core.config import get_settings
from app.core.database import (
    check_database_connection,
    close_db_pool,
    init_db_pool,
)
from app.core.errors import ServiceUnavailableError, register_exception_handlers
from app.core.logging import setup_logging
from app.schemas.health import HealthResponse, ReadyResponse

logger = logging.getLogger("sciresearch-ai.main")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Manage application startup and shutdown lifecycles."""
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)
    logger.info(
        "Starting SciResearch AI service in %s mode on port %d...",
        settings.ENVIRONMENT,
        settings.effective_port,
    )

    try:
        await init_db_pool()
    except Exception as exc:
        logger.warning("Database pool initialization warning during startup: %s", exc)

    yield

    logger.info("Shutting down SciResearch AI service...")
    await close_db_pool()


app = FastAPI(
    title="SciResearch AI Service",
    description=(
        "Scientific literature research, document processing, and "
        "multi-agent orchestration API."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Attach centralized error handlers
register_exception_handlers(app)

# Mount API routes
app.include_router(research_router)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Report the availability and liveness of the AI service."""
    return HealthResponse(status="ok", service="sciresearch-ai")


@app.get(
    "/ready",
    response_model=ReadyResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
)
@app.get(
    "/health/ready",
    response_model=ReadyResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    include_in_schema=False,
)
async def readiness_check() -> ReadyResponse:
    """Verify that external dependencies (PostgreSQL database) are reachable."""
    try:
        is_connected = await check_database_connection()
        if not is_connected:
            raise ServiceUnavailableError(
                message="The database is not responding",
                code="DATABASE_UNAVAILABLE",
            )
        return ReadyResponse(status="ready", database="connected")
    except Exception as exc:
        logger.error("Readiness probe database error: %s", exc)
        raise ServiceUnavailableError(
            message="The database is unavailable",
            code="DATABASE_UNAVAILABLE",
        ) from exc
