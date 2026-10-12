"""Vector similarity search service for RAG retrieval.

Queries the `paper_passages` table using pgvector cosine similarity to find
the most semantically relevant passages for a given query.

Falls back to BM25-style token overlap scoring when embeddings are unavailable,
ensuring the pipeline degrades gracefully rather than failing hard.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.core.database import get_db_pool
from app.services.embedding_service import embedding_service

logger = logging.getLogger("ai_service.vector_search")


def _tokenize(text: str) -> set[str]:
    """Extract lowercased alphanumeric tokens (3+ chars) from text."""
    return set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower()))


def _token_overlap_score(query_tokens: set[str], passage_text: str) -> float:
    """BM25-inspired token overlap fallback score."""
    passage_tokens = _tokenize(passage_text)
    if not passage_tokens:
        return 0.0
    overlap = len(query_tokens.intersection(passage_tokens))
    return overlap / (len(query_tokens) + 1.0)


async def vector_search(
    query: str,
    run_id: str,
    top_k: int = 8,
) -> list[dict[str, Any]]:
    """
    Find the top-k most relevant passages for a query using cosine similarity.

    Strategy:
    1. Try to embed the query with Gemini text-embedding-004.
    2. If embedding succeeds → pgvector cosine similarity search.
    3. If embedding fails / no vectors in DB → token overlap fallback.

    Args:
        query:  Natural language search query.
        run_id: Research run UUID — scopes the search to papers in this run.
        top_k:  Maximum number of passages to return.

    Returns:
        List of passage dicts with keys: id, text, page_number, section, score.
    """
    # ── Attempt vector search ──────────────────────────────────────────────
    query_embedding = await embedding_service.embed_query(query)

    if query_embedding:
        try:
            return await _pgvector_search(query_embedding, run_id, top_k)
        except Exception as exc:
            logger.warning("pgvector search failed, falling back to BM25: %s", exc)

    # ── Fallback: token overlap ────────────────────────────────────────────
    logger.info("Using token-overlap retrieval for query: %s", query[:60])
    return await _token_overlap_search(query, run_id, top_k)


async def _pgvector_search(
    query_embedding: list[float],
    run_id: str,
    top_k: int,
) -> list[dict[str, Any]]:
    """Execute a cosine similarity query using pgvector."""
    pool = get_db_pool()

    # Cast the Python list to a Postgres vector literal
    vec_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"

    sql = """
        SELECT
            pp.id,
            pp.text,
            pp.page_number,
            pp.section,
            1 - (pp.embedding <=> $1::vector) AS score
        FROM paper_passages pp
        JOIN research_run_papers rp ON rp.paper_id = pp.paper_id
        WHERE rp.run_id = $2
        AND pp.embedding IS NOT NULL
        ORDER BY pp.embedding <=> $1::vector
        LIMIT $3
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, vec_literal, run_id, top_k)

    results = [
        {
            "id":          str(r["id"]),
            "text":        r["text"],
            "page_number": r["page_number"],
            "section":     r["section"],
            "score":       float(r["score"]),
        }
        for r in rows
    ]
    logger.info(
        "pgvector search returned %d passages for run %s", len(results), run_id
    )
    return results


async def _token_overlap_search(
    query: str,
    run_id: str,
    top_k: int,
) -> list[dict[str, Any]]:
    """Fallback BM25-style retrieval when vectors are unavailable."""
    pool = get_db_pool()

    sql = """
        SELECT pp.id, pp.text, pp.page_number, pp.section
        FROM paper_passages pp
        JOIN research_run_papers rp ON rp.paper_id = pp.paper_id
        WHERE rp.run_id = $1
        LIMIT 200
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, run_id)

    if not rows:
        return []

    query_tokens = _tokenize(query)
    scored = [
        {
            "id":          str(r["id"]),
            "text":        r["text"],
            "page_number": r["page_number"],
            "section":     r["section"],
            "score":       _token_overlap_score(query_tokens, r["text"]),
        }
        for r in rows
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


async def embed_and_store_passages(
    passages: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Generate embeddings for a list of passages and persist them to the DB.

    Called after passages are saved to `paper_passages` so we can update
    the embedding column. Skips passages where embedding generation fails.

    Returns the passages list with an `embedding` key added where successful.
    """
    if not passages or not embedding_service._is_available():
        return passages

    texts = [p["text"] for p in passages]
    logger.info("Generating embeddings for %d passages…", len(texts))
    vectors = await embedding_service.embed_many(texts)

    # If all vectors failed (e.g. quota exhausted), return immediately
    valid_vectors = [v for v in vectors if v is not None]
    if not valid_vectors:
        logger.info("No vectors generated (quota or fallback active), continuing with token-overlap.")
        return passages

    pool = get_db_pool()
    updated = 0

    async with pool.acquire() as conn:
        for passage, vec in zip(passages, vectors):
            if vec is None:
                continue
            vec_literal = "[" + ",".join(str(v) for v in vec) + "]"
            await conn.execute(
                "UPDATE paper_passages SET embedding = $1::vector WHERE id = $2",
                vec_literal,
                passage["id"],
            )
            passage["embedding"] = vec
            updated += 1

    logger.info("Stored embeddings for %d / %d passages", updated, len(passages))
    return passages
