"""
FastAPI service exposing the research pipeline over HTTP.

This sits alongside the Streamlit UI and the CLI as a third, machine-friendly
entry point into the same `run_research_pipeline` — nothing agent-specific
lives here, it's a thin, well-behaved web layer:

* runs the (blocking, network-bound) pipeline in a worker thread so the
  event loop stays responsive for concurrent requests / health checks
* maps internal errors to sensible HTTP status codes instead of leaking
  stack traces
* tags every request/response with a correlation id for log tracing
* exposes liveness/readiness endpoints for container orchestrators
"""
from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from src.config import get_settings
from src.pipelines.pipeline import PipelineError, run_research_pipeline
from src.schemas import ResearchResult
from src.utils.logger import get_logger, setup_logging

settings = get_settings()
setup_logging(level=settings.log_level, json_output=settings.log_json)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("API starting up", extra={"extra_fields": {"environment": settings.environment}})
    yield
    logger.info("API shutting down")


app = FastAPI(
    title="Multi-Agent Research System API",
    description=(
        "HTTP interface for the Search → Reader → Writer → Critic research "
        "pipeline. See `/docs` for interactive OpenAPI documentation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Locked down to same-origin by default; override for a hosted frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment != "production" else [],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    """Stamp every request with a correlation id and log its outcome/latency."""
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000, 1)
    response.headers["x-request-id"] = request_id
    logger.info(
        "%s %s -> %s (%sms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        extra={
            "extra_fields": {
                "request_id": request_id,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        },
    )
    return response


class ResearchRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300, examples=["Future of LLM agents in 2026"])


class ErrorResponse(BaseModel):
    detail: str


@app.get("/health", tags=["ops"], summary="Liveness probe")
def health() -> dict:
    """Process is up. Does not touch any external dependency."""
    return {"status": "ok"}


@app.get("/ready", tags=["ops"], summary="Readiness probe")
def ready() -> dict:
    """Config loaded successfully and required secrets are present."""
    try:
        get_settings()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"status": "ready", "environment": settings.environment}


@app.post(
    "/research",
    tags=["research"],
    summary="Run the full search → read → write → critique pipeline",
    response_model=ResearchResult,
    responses={502: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def research(payload: ResearchRequest) -> ResearchResult:
    """Blocking, network-bound work is offloaded to a worker thread so this
    endpoint can be called concurrently without blocking the event loop."""
    try:
        return await run_in_threadpool(run_research_pipeline, payload.topic)
    except PipelineError as exc:
        logger.warning("Pipeline failed for topic=%r: %s", payload.topic, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})
