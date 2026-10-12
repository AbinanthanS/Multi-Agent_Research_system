"""Tests for PDF download safeguards and in-memory text extraction."""

import io

import pymupdf
import pytest

from app.core.errors import BadRequestError
from app.services.chunking import chunk_text, process_paper_into_passages
from app.services.pdf_extractor import (
    download_pdf_safely,
    extract_pdf_pages_and_sections,
)


def _create_sample_pdf_bytes() -> bytes:
    """Generate a valid minimal in-memory PDF with sample academic text."""
    doc = pymupdf.open()
    page = doc.new_page()

    # Add sample title, abstract, and section
    page.insert_text(
        (50, 50),
        "Abstract\nThis paper introduces an autonomous multi-agent research framework.",
        fontsize=12,
    )
    page.insert_text(
        (50, 100),
        "Introduction\nRecent advances in LLMs demonstrate reasoning.",
        fontsize=12,
    )

    buffer = io.BytesIO()
    doc.save(buffer)
    doc.close()
    return buffer.getvalue()


def test_extract_pdf_pages_and_sections():
    """Verify that PyMuPDF extracts text and detects section headers."""
    pdf_bytes = _create_sample_pdf_bytes()
    assert len(pdf_bytes) > 0

    pages = extract_pdf_pages_and_sections(pdf_bytes)
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert "multi-agent research framework" in pages[0]["text"]


def test_extract_pdf_empty_bytes():
    """Verify that empty or corrupt bytes handle cleanly without crashing."""
    pages = extract_pdf_pages_and_sections(b"")
    assert pages == []

    corrupt_pages = extract_pdf_pages_and_sections(b"not-a-valid-pdf")
    assert corrupt_pages == []


def test_chunk_text_boundaries():
    """Verify that chunking respects sentence boundaries and target lengths."""
    text = (
        "Sentence one is foundational. "
        "Sentence two introduces deep architectures. "
        "Sentence three demonstrates state-of-the-art results on standard benchmarks. "
        "Sentence four discusses the limitations."
    )
    chunks = chunk_text(text, target_chunk_chars=80, overlap_chars=20)
    assert len(chunks) >= 2
    assert "Sentence one is foundational." in chunks[0]


def test_process_paper_into_passages():
    """Verify paper abstract and pages turn into structured passages."""
    paper_id = "11111111-1111-1111-1111-111111111111"
    passages = process_paper_into_passages(
        paper_id=paper_id,
        title="Multi-Agent Reasoning Systems",
        abstract="We present an autonomous agent graph for scientific discovery.",
        extracted_pages=[
            {
                "page_number": 1,
                "section": "Introduction",
                "text": "Autonomous systems require robust verification.",
            }
        ],
    )

    assert len(passages) >= 2
    assert passages[0]["paper_id"] == paper_id
    assert passages[0]["section"] == "Abstract"
    assert passages[1]["section"] == "Introduction"


@pytest.mark.asyncio
async def test_download_pdf_safely_size_guard(monkeypatch):
    """Verify that downloads exceeding max_size_bytes raise BadRequestError."""
    # Test Content-Length guard
    class MockResponse:
        status_code = 200
        headers = {"content-length": "20000000"}  # 20 MB

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def aiter_bytes(self, chunk_size=65536):
            yield b"x" * 1000

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        def stream(self, method, url, **kwargs):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", MockClient)

    with pytest.raises(BadRequestError) as exc_info:
        await download_pdf_safely(
            "https://arxiv.org/pdf/sample.pdf",
            max_size_bytes=10_000_000,
        )

    assert "exceeds limit" in str(exc_info.value.message)
