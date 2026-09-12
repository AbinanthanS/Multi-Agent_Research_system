"""
Typed contracts for data moving between agents/chains and the UI/CLI.

Using `with_structured_output` against `CriticFeedback` instead of parsing a
free-text "Score: X/10" block removes an entire class of brittle-regex bugs
and makes the critic's score usable programmatically (e.g. to gate
auto-retry of the writer chain).
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class SourceLink(BaseModel):
    title: str
    url: str
    snippet: str = ""


class CriticFeedback(BaseModel):
    score: int = Field(..., ge=1, le=10, description="Overall quality score out of 10")
    strengths: list[str] = Field(default_factory=list)
    areas_to_improve: list[str] = Field(default_factory=list)
    verdict: str = Field(..., description="One-line summary verdict")


class ResearchResult(BaseModel):
    topic: str
    search_summary: str
    scraped_content: str
    report_markdown: str
    critique: CriticFeedback
    sources: list[SourceLink] = Field(default_factory=list)
    duration_seconds: float = 0.0
