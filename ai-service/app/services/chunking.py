"""Passage chunking and text segmentation service.

Splits extracted academic paper texts and abstracts into coherent passages
respecting sentence boundaries and structural sections.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")


def chunk_text(
    text: str,
    target_chunk_chars: int = 600,
    overlap_chars: int = 100,
) -> list[str]:
    """Split text into overlapping chunks respecting sentence boundaries."""
    text = text.strip()
    if not text:
        return []

    if len(text) <= target_chunk_chars:
        return [text]

    sentences = SENTENCE_SPLIT_PATTERN.split(text)
    chunks: list[str] = []
    current_sentences: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        sentence_len = len(sentence)
        if current_length + sentence_len > target_chunk_chars and current_sentences:
            chunk = " ".join(current_sentences)
            chunks.append(chunk)

            # Keep trailing sentences for overlap
            overlap_sentences: list[str] = []
            overlap_len = 0
            for prev_s in reversed(current_sentences):
                if overlap_len + len(prev_s) <= overlap_chars:
                    overlap_sentences.insert(0, prev_s)
                    overlap_len += len(prev_s)
                else:
                    break

            current_sentences = overlap_sentences + [sentence]
            current_length = sum(len(s) for s in current_sentences) + len(
                current_sentences
            )
        else:
            current_sentences.append(sentence)
            current_length += sentence_len + 1

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


def process_paper_into_passages(
    paper_id: str,
    title: str,
    abstract: str | None,
    extracted_pages: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Process a paper's abstract and/or extracted pages into database-ready passages.

    Returns a list of passages matching the `paper_passages` table schema:
        - id: str (UUID)
        - paper_id: str (UUID)
        - passage_index: int
        - text: str
        - page_number: int | None
        - section: str
    """
    passages: list[dict[str, Any]] = []
    passage_index = 0

    # 1. Always generate an abstract passage if present
    if abstract and abstract.strip():
        abstract_chunks = chunk_text(abstract.strip(), target_chunk_chars=700)
        for chunk in abstract_chunks:
            passages.append(
                {
                    "id": str(uuid.uuid4()),
                    "paper_id": paper_id,
                    "passage_index": passage_index,
                    "text": chunk,
                    "page_number": 1,
                    "section": "Abstract",
                }
            )
            passage_index += 1

    # 2. Process extracted pages if available
    if extracted_pages:
        for page_data in extracted_pages:
            page_text = page_data.get("text", "")
            page_num = page_data.get("page_number", 1)
            section = page_data.get("section", "Body")

            chunks = chunk_text(page_text, target_chunk_chars=600)
            for chunk in chunks:
                passages.append(
                    {
                        "id": str(uuid.uuid4()),
                        "paper_id": paper_id,
                        "passage_index": passage_index,
                        "text": chunk,
                        "page_number": page_num,
                        "section": section,
                    }
                )
                passage_index += 1

    # 3. Fallback: if no pages and no abstract, use title
    if not passages and title:
        passages.append(
            {
                "id": str(uuid.uuid4()),
                "paper_id": paper_id,
                "passage_index": 0,
                "text": f"Paper Title: {title}",
                "page_number": 1,
                "section": "Title",
            }
        )

    return passages
