"""Safe PDF downloader and text extractor service.

Provides streaming PDF downloads with chunk-level byte counting to defend
against payload exhaustion attacks, and in-memory text extraction using PyMuPDF.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx
import pymupdf

from app.core.config import get_settings
from app.core.errors import BadRequestError

logger = logging.getLogger("ai_service.pdf_extractor")

# Common academic section header patterns
SECTION_PATTERN = re.compile(
    r"^(?:\d+[\.\s]+)?(abstract|introduction|related\s+work|background|"
    r"methodology|methods|system\s+design|architecture|implementation|"
    r"evaluation|experiments|results|discussion|limitations|conclusion|references)$",
    re.IGNORECASE,
)


async def download_pdf_safely(
    url: str,
    max_size_bytes: int | None = None,
    timeout_secs: float | None = None,
) -> bytes:
    """Download a PDF stream with pre-validation and chunk byte-counting limits.

    Raises:
        BadRequestError: If payload exceeds size limits or URL is invalid.
    """
    settings = get_settings()
    max_bytes = max_size_bytes or settings.max_pdf_size_bytes
    timeout = timeout_secs or settings.download_timeout_secs

    ua_repo = "https://github.com/AbinanthanS/Multi-Agent_Research_system"
    headers = {
        "User-Agent": f"MultiAgentResearchSystem/1.0 (+{ua_repo}; academic research)",
        "Accept": "application/pdf,*/*",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", url, headers=headers) as response:
                if response.status_code >= 400:
                    raise BadRequestError(
                        f"Failed to fetch PDF from {url}: HTTP {response.status_code}"
                    )

                # Check Content-Length if provided by server
                content_length = response.headers.get("content-length")
                if content_length:
                    try:
                        expected_bytes = int(content_length)
                        if expected_bytes > max_bytes:
                            raise BadRequestError(
                                f"PDF size ({expected_bytes} bytes) exceeds limit "
                                f"({max_bytes} bytes)"
                            )
                    except ValueError:
                        pass

                # Stream and enforce running byte limit
                chunks: list[bytes] = []
                total_bytes = 0

                async for chunk in response.aiter_bytes(chunk_size=65536):
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise BadRequestError(
                            f"PDF download exceeded limit of {max_bytes} bytes"
                        )
                    chunks.append(chunk)

                pdf_data = b"".join(chunks)
                logger.info(
                    "Downloaded PDF successfully from %s (%d bytes)",
                    url,
                    total_bytes,
                )
                return pdf_data

    except httpx.RequestError as exc:
        logger.warning("Network error downloading PDF from %s: %s", url, exc)
        raise BadRequestError(f"Network error downloading PDF: {exc}") from exc


def extract_pdf_pages_and_sections(
    pdf_bytes: bytes,
) -> list[dict[str, Any]]:
    """Extract text pages and detected section headers from in-memory PDF bytes.

    Returns a list of dicts with keys:
        - page_number: int (1-indexed)
        - section: str
        - text: str
    """
    if not pdf_bytes:
        return []

    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        logger.warning("Failed to parse PDF bytes: %s", exc)
        return []

    extracted: list[dict[str, Any]] = []
    current_section = "Introduction"

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_number = page_idx + 1

        # Use blocks to detect headings and structure
        blocks = page.get_text("blocks")
        page_paragraphs: list[str] = []

        for block in blocks:
            # Block format: (x0, y0, x1, y1, text, block_no, block_type)
            if len(block) >= 5 and block[4]:
                raw_text = block[4].strip()
                if not raw_text:
                    continue

                lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
                if not lines:
                    continue

                first_line = lines[0]
                if len(first_line) < 50 and SECTION_PATTERN.match(first_line):
                    current_section = first_line.title()
                    body_lines = lines[1:]
                    if body_lines:
                        page_paragraphs.append("\n".join(body_lines))
                else:
                    page_paragraphs.append(raw_text)

        full_page_text = "\n\n".join(page_paragraphs).strip()
        if full_page_text:
            extracted.append(
                {
                    "page_number": page_number,
                    "section": current_section,
                    "text": full_page_text,
                }
            )

    doc.close()
    return extracted
