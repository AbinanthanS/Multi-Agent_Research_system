"""Pydantic schemas for the research execution endpoint."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PaperInput(BaseModel):
    id: str
    title: str
    abstract: str | None = None
    authors: list[str] | None = None
    published_year: int | None = None
    url: str | None = None
    pdf_url: str | None = None


class ResearchExecuteRequest(BaseModel):
    run_id: str = Field(..., description="UUID of the research run")
    question: str = Field(..., min_length=3, description="Research question or prompt")
    papers: list[PaperInput] = Field(
        default_factory=list, description="Candidate papers to extract and synthesize"
    )


class PassageOutput(BaseModel):
    id: str
    paper_id: str
    passage_index: int
    text: str
    page_number: int | None = None
    section: str = "General"


class ClaimOutput(BaseModel):
    id: str
    claim_text: str
    claim_type: str
    confidence: float


class ClaimEvidenceOutput(BaseModel):
    claim_id: str
    passage_id: str
    support_type: str
    explanation: str


class ReportOutput(BaseModel):
    title: str
    markdown_content: str
    structured_content: dict[str, Any]


class ResearchExecuteResponse(BaseModel):
    run_id: str
    passages: list[PassageOutput]
    claims: list[ClaimOutput]
    evidence: list[ClaimEvidenceOutput]
    report: ReportOutput
