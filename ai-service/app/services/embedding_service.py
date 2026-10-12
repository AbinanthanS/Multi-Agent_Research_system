"""Gemini Embedding Service for RAG vector generation.

Uses the official `google-genai` SDK (replacement for deprecated google.generativeai)
to produce 768-dimensional vectors with the `text-embedding-004` model.

Design decisions:
- Lazy initialisation: client created only on first call.
- Batch support: embed_many() sends passages concurrently (async gather).
- Graceful degradation: returns None when key absent or API fails,
  allowing the pipeline to fall back to BM25 token-overlap retrieval.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import app.core.network  # noqa: F401 - ensure IPv4 precedence on Windows
from app.core.config import get_settings

logger = logging.getLogger("ai_service.embedding")

_TASK_TYPE_DOC   = "RETRIEVAL_DOCUMENT"
_TASK_TYPE_QUERY = "RETRIEVAL_QUERY"
_BATCH_SIZE = 50   # safe concurrent batch size


def _get_client():
    """Lazy import of the new google-genai SDK client. Returns None if unavailable."""
    try:
        from google import genai  # type: ignore
        settings = get_settings()
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as exc:
        logger.warning("Could not create google-genai client: %s", exc)
        return None


class EmbeddingService:
    """Singleton service for generating Gemini text embeddings."""

    _instance: "EmbeddingService | None" = None
    _ready: bool = False
    _quota_exhausted: bool = False

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _is_available(self) -> bool:
        """Check whether Gemini is configured, not exhausted, and SDK is installed."""
        if self._quota_exhausted:
            return False
        settings = get_settings()
        if not settings.gemini_enabled:
            logger.warning(
                "GEMINI_API_KEY not set — embedding disabled. "
                "RAG will fall back to token-overlap scoring."
            )
            return False
        try:
            from google import genai  # noqa: F401
            return True
        except ImportError:
            logger.warning("google-genai not installed — embeddings disabled.")
            return False

    async def embed_text(
        self, text: str, task_type: str = _TASK_TYPE_DOC
    ) -> list[float] | None:
        """Embed a single text string. Returns None on any failure."""
        if not self._is_available():
            return None

        settings = get_settings()
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            cfg = types.EmbedContentConfig(
                output_dimensionality=768,
                task_type=task_type,
            )
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: client.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=text,
                    config=cfg,
                ),
            )
            # New SDK returns result.embeddings[0].values
            return list(result.embeddings[0].values)
        except Exception as exc:
            err_str = str(exc)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                self._quota_exhausted = True
                logger.warning(
                    "Gemini embedding quota exhausted (429). Tripping circuit breaker — "
                    "falling back immediately to fast BM25 token overlap without stalling."
                )
            else:
                logger.error("Embedding call failed: %s", exc)
            return None

    async def embed_query(self, query: str) -> list[float] | None:
        """Embed a search query (uses RETRIEVAL_QUERY task type)."""
        return await self.embed_text(query, task_type=_TASK_TYPE_QUERY)

    async def embed_many(
        self, texts: list[str], task_type: str = _TASK_TYPE_DOC
    ) -> list[list[float] | None]:
        """Embed a list of texts concurrently in batches, probing first to avoid quota stalls."""
        if not texts or not self._is_available():
            return []

        # Probe with first text to verify quota before bulk requests
        first_emb = await self.embed_text(texts[0], task_type)
        if self._quota_exhausted or first_emb is None:
            logger.info(
                "Embedding probe returned None (quota exhausted or unavailable). "
                "Skipping remaining %d passages.",
                len(texts) - 1,
            )
            return [first_emb] + [None] * (len(texts) - 1)

        results: list[list[float] | None] = [first_emb]
        remaining = texts[1:]
        for i in range(0, len(remaining), _BATCH_SIZE):
            if self._quota_exhausted:
                results.extend([None] * (len(remaining) - i))
                break
            batch = remaining[i : i + _BATCH_SIZE]
            batch_results = await asyncio.gather(
                *[self.embed_text(t, task_type) for t in batch],
                return_exceptions=False,
            )
            results.extend(batch_results)
        return results


# Module-level singleton
embedding_service = EmbeddingService()
