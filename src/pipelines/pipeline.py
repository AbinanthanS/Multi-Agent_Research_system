from __future__ import annotations

import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from src.agents.agents import build_search_agent, run_critic, run_writer
from src.config import get_settings
from src.schemas import ResearchResult, SourceLink
from src.tools.tools import scrape_url_impl
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_URL_RE = re.compile(r"https?://[^\s\)\]]+")


class PipelineError(Exception):
    """Raised when the pipeline cannot produce a usable result."""


def _extract_sources(search_text: str) -> list[SourceLink]:
    """Parse the search agent's free-text output back into structured (title, url, snippet)
    blocks, matching the `web_search` tool's own output format."""
    sources: list[SourceLink] = []
    blocks = search_text.split("\n----\n")
    for block in blocks:
        title_match = re.search(r"Title:\s*(.+)", block)
        url_match = re.search(r"URL:\s*(\S+)", block)
        snippet_match = re.search(r"Snippet:\s*(.+)", block, re.DOTALL)
        if url_match:
            sources.append(
                SourceLink(
                    title=(title_match.group(1).strip() if title_match else url_match.group(1)),
                    url=url_match.group(1).strip(),
                    snippet=(snippet_match.group(1).strip()[:300] if snippet_match else ""),
                )
            )
    if not sources:
        # Fall back to any bare URLs the agent's summary happened to include.
        for url in _URL_RE.findall(search_text)[: settings.scrape_max_urls]:
            sources.append(SourceLink(title=url, url=url))
    return sources


def _scrape_sources_concurrently(sources: list[SourceLink]) -> str:
    """Scrape up to `scrape_max_urls` sources in parallel instead of one at a time,
    so wall-clock time doesn't scale linearly with the number of sources."""
    targets = sources[: settings.scrape_max_urls]
    if not targets:
        return "No URLs available to scrape."

    results: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=len(targets)) as executor:
        future_to_url = {executor.submit(scrape_url_impl, s.url): s.url for s in targets}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Scrape failed for %s: %s", url, exc)
                results[url] = f"(failed to scrape: {exc})"

    return "\n\n".join(f"SOURCE: {url}\n{content}" for url, content in results.items())


def run_research_pipeline(topic: str, on_step=None) -> ResearchResult:
    """Run the full search -> read -> write -> critique pipeline.

    `on_step`, if provided, is called as `on_step(step_name: str, status: str)`
    with status in {"running", "done"} after each stage — lets a UI (e.g. the
    Streamlit app) render live progress without the pipeline knowing about Streamlit.
    """

    def _notify(step: str, status: str) -> None:
        if on_step:
            on_step(step, status)

    if not topic or not topic.strip():
        raise PipelineError("Research topic must not be empty.")

    start = time.monotonic()
    logger.info("Pipeline started", extra={"extra_fields": {"topic": topic}})

    # Step 1: search
    logger.info("Step 1/4: search agent running")
    _notify("search", "running")
    try:
        search_agent = build_search_agent()
        search_result = search_agent.invoke(
            {"messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]}
        )
        search_text = search_result["messages"][-1].content
    except Exception as exc:  # noqa: BLE001
        logger.exception("Search step failed")
        raise PipelineError(f"Search step failed: {exc}") from exc

    sources = _extract_sources(search_text)
    logger.info("Search complete: %d sources found", len(sources))
    _notify("search", "done")

    # Step 2: read (concurrent scraping, no LLM round-trip needed per URL)
    logger.info("Step 2/4: reader scraping %d sources concurrently", min(len(sources), settings.scrape_max_urls))
    _notify("reader", "running")
    scraped_content = _scrape_sources_concurrently(sources)
    _notify("reader", "done")

    # Step 3: write
    logger.info("Step 3/4: writer drafting report")
    _notify("writer", "running")
    research_combined = f"SEARCH RESULTS:\n{search_text}\n\nDETAILED SCRAPED CONTENT:\n{scraped_content}"
    try:
        report = run_writer(topic=topic, research=research_combined)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Writer step failed")
        raise PipelineError(f"Writer step failed: {exc}") from exc
    _notify("writer", "done")

    # Step 4: critique
    logger.info("Step 4/4: critic reviewing report")
    _notify("critic", "running")
    try:
        critique = run_critic(report=report)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Critic step failed")
        raise PipelineError(f"Critic step failed: {exc}") from exc
    _notify("critic", "done")

    duration = time.monotonic() - start
    logger.info("Pipeline finished in %.1fs (score=%s/10)", duration, critique.score)

    return ResearchResult(
        topic=topic,
        search_summary=search_text,
        scraped_content=scraped_content,
        report_markdown=report,
        critique=critique,
        sources=sources,
        duration_seconds=round(duration, 2),
    )
