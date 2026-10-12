"""Tests for the LangGraph multi-agent research workflow and execute API."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.research_graph import research_graph
from app.main import app


def test_research_graph_direct_invocation():
    """Verify that the compiled LangGraph executes through all 4 agent nodes."""
    initial_state = {
        "question": "How do transformer attention mechanisms scale with length?",
        "papers": [
            {
                "id": "paper-1",
                "title": "Attention Is All You Need",
                "authors": ["Vaswani et al."],
                "published_year": 2017,
                "url": "https://arxiv.org/abs/1706.03762",
            }
        ],
        "passages": [
            {
                "id": "passage-1",
                "paper_id": "paper-1",
                "passage_index": 0,
                "text": (
                    "The Transformer uses multi-head self-attention mechanisms to "
                    "compute representations of sequences without recurrent alignment."
                ),
                "page_number": 1,
                "section": "Abstract",
            },
            {
                "id": "passage-2",
                "paper_id": "paper-1",
                "passage_index": 1,
                "text": (
                    "Self-attention connects all positions with constant operations, "
                    "though memory scales quadratically."
                ),
                "page_number": 2,
                "section": "Complexity",
            },
        ],
        "sub_queries": [],
        "claims": [],
        "claim_evidence": [],
        "report_title": "",
        "markdown_content": "",
        "structured_content": {},
    }

    result = research_graph.invoke(initial_state)

    # 1. Planner output
    assert len(result["sub_queries"]) == 4

    # 2. Extractor output
    assert len(result["claims"]) >= 1
    for claim in result["claims"]:
        assert "claim_text" in claim
        assert claim["claim_type"] in [
            "finding",
            "methodology",
            "limitation",
            "implication",
        ]

    # 3. Critic output
    assert len(result["claim_evidence"]) >= 1
    for ev in result["claim_evidence"]:
        assert ev["support_type"] in ["supporting", "contextual", "contradicting"]
        assert "explanation" in ev

    # 4. Synthesizer output
    assert "report_title" in result
    assert "Attention Is All You Need" in result["markdown_content"]
    assert "Executive Summary" in result["markdown_content"]
    assert result["structured_content"]["total_papers_analyzed"] == 1


@pytest.mark.asyncio
async def test_execute_research_api_endpoint():
    """Verify POST /api/v1/research/execute orchestrates extraction and synthesis."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "run_id": "99999999-9999-9999-9999-999999999999",
            "question": "What are the core bottlenecks of diffusion models in imaging?",
            "papers": [
                {
                    "id": "88888888-8888-8888-8888-888888888888",
                    "title": "Denoising Diffusion Probabilistic Models in Cryo-EM",
                    "abstract": (
                        "Diffusion models provide generative priors for cryo-EM "
                        "reconstruction, achieving high resolution."
                    ),
                    "authors": ["Ho et al.", "Song et al."],
                    "published_year": 2024,
                    "url": "https://arxiv.org/abs/sample",
                }
            ],
        }

        response = await client.post("/api/v1/research/execute", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["run_id"] == payload["run_id"]
        assert len(data["passages"]) >= 1
        assert len(data["claims"]) >= 1
        assert len(data["evidence"]) >= 1
        assert "Cryo-EM" in data["report"]["markdown_content"]
