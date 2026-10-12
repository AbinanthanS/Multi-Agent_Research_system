"""Research execution router.

Exposes the core AI pipeline coordinating PDF extraction, passage chunking,
and LangGraph multi-agent synthesis.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter

from app.agents.research_graph import research_graph
from app.schemas.research import (
    ResearchExecuteRequest,
    ResearchExecuteResponse,
)
from app.services.chunking import process_paper_into_passages
from app.services.pdf_extractor import (
    download_pdf_safely,
    extract_pdf_pages_and_sections,
)

logger = logging.getLogger("ai_service.api.research")

router = APIRouter(prefix="/api/v1/research", tags=["research"])


async def _process_single_paper(paper_dict: dict) -> list[dict]:
    """Download PDF if available, otherwise chunk abstract."""
    paper_id = paper_dict["id"]
    pdf_url = paper_dict.get("pdf_url")
    title = paper_dict.get("title", "Untitled")
    abstract = paper_dict.get("abstract")

    extracted_pages = []

    if pdf_url:
        try:
            logger.info(
                "Attempting PDF download for paper %s from %s", paper_id, pdf_url
            )
            # Cap download at 15 MB and 15s for API latency
            pdf_bytes = await download_pdf_safely(pdf_url, timeout_secs=15.0)
            extracted_pages = extract_pdf_pages_and_sections(pdf_bytes)
            logger.info(
                "Extracted %d pages for paper %s", len(extracted_pages), paper_id
            )
        except Exception as exc:
            logger.warning(
                "Failed to download/extract PDF for %s: %s. Using abstract fallback.",
                paper_id,
                exc,
            )

    return process_paper_into_passages(
        paper_id=paper_id,
        title=title,
        abstract=abstract,
        extracted_pages=extracted_pages,
    )


@router.post("/execute", response_model=ResearchExecuteResponse)
async def execute_research(payload: ResearchExecuteRequest) -> ResearchExecuteResponse:
    """Execute end-to-end multi-agent research pipeline for a given run and question."""
    logger.info(
        "Beginning research execution for run %s: '%s' (%d candidate papers)",
        payload.run_id,
        payload.question,
        len(payload.papers),
    )

    # 1. Concurrently process papers (download PDFs or fallback to abstracts)
    papers_data = [p.model_dump() for p in payload.papers]
    tasks = [_process_single_paper(p) for p in papers_data]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_passages: list[dict] = []
    for r in results:
        if isinstance(r, list):
            all_passages.extend(r)

    logger.info("Generated %d passages across candidate papers", len(all_passages))

    # 2. Invoke LangGraph multi-agent research pipeline
    initial_state = {
        "question": payload.question,
        "papers": papers_data,
        "passages": all_passages,
        "sub_queries": [],
        "claims": [],
        "claim_evidence": [],
        "report_title": "",
        "markdown_content": "",
        "structured_content": {},
    }

    # Run LangGraph sync pipeline in thread to avoid blocking event loop
    final_state = await asyncio.to_thread(research_graph.invoke, initial_state)

    return ResearchExecuteResponse(
        run_id=payload.run_id,
        passages=all_passages,
        claims=final_state["claims"],
        evidence=final_state["claim_evidence"],
        report={
            "title": final_state["report_title"],
            "markdown_content": final_state["markdown_content"],
            "structured_content": final_state["structured_content"],
        },
    )
