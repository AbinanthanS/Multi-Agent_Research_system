from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Liveness probe response model."""

    status: str = Field(default="ok", description="Service operational status")
    service: str = Field(default="sciresearch-ai", description="Service identifier")


class ReadyResponse(BaseModel):
    """Readiness probe response model."""

    status: str = Field(default="ready", description="Readiness status")
    database: str = Field(default="connected", description="PostgreSQL status")
