from unittest.mock import patch

from fastapi.testclient import TestClient

from src.api import app
from src.pipelines.pipeline import PipelineError
from src.schemas import CriticFeedback, ResearchResult

client = TestClient(app)


def _fake_result(topic: str) -> ResearchResult:
    return ResearchResult(
        topic=topic,
        search_summary="search text",
        scraped_content="scraped text",
        report_markdown="# Report\n\nBody",
        critique=CriticFeedback(score=9, strengths=["clear"], areas_to_improve=[], verdict="Great."),
        sources=[],
        duration_seconds=1.23,
    )


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ready_endpoint():
    resp = client.get("/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


def test_research_endpoint_happy_path():
    with patch("src.api.run_research_pipeline", return_value=_fake_result("quantum computing")):
        resp = client.post("/research", json={"topic": "quantum computing"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["topic"] == "quantum computing"
    assert body["critique"]["score"] == 9
    assert "x-request-id" in resp.headers


def test_research_endpoint_rejects_short_topic():
    resp = client.post("/research", json={"topic": "ai"})
    assert resp.status_code == 422


def test_research_endpoint_maps_pipeline_error_to_502():
    with patch("src.api.run_research_pipeline", side_effect=PipelineError("search step failed")):
        resp = client.post("/research", json={"topic": "a valid topic"})

    assert resp.status_code == 502
    assert "search step failed" in resp.json()["detail"]


def test_request_id_is_echoed_back():
    resp = client.get("/health", headers={"x-request-id": "abc-123"})
    assert resp.headers["x-request-id"] == "abc-123"
