from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


app = FastAPI(
    title="SciResearch AI Service",
    description="Scientific literature research and multi-agent orchestration API.",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Report the availability of the AI service."""
    return HealthResponse(
        status="ok",
        service="sciresearch-ai",
    )
