from __future__ import annotations

import re

import requests
import trafilatura
from bs4 import BeautifulSoup
from langchain.tools import tool
from readability import Document
from tavily import TavilyClient
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from src.config import get_settings
from src.utils.caching import RateLimiter, TTLCache
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_tavily_client: TavilyClient | None = None
_search_cache = TTLCache(ttl_seconds=settings.cache_ttl_seconds)
_scrape_cache = TTLCache(ttl_seconds=settings.cache_ttl_seconds)
_rate_limiter = RateLimiter(calls_per_minute=settings.rate_limit_calls_per_minute)

_SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

_STRIP_TAGS = ("script", "style", "nav", "footer", "header", "aside", "form")


def _get_tavily_client() -> TavilyClient:
    global _tavily_client
    if _tavily_client is None:
        _tavily_client = TavilyClient(api_key=settings.tavily_api_key)
    return _tavily_client


class ScrapeError(Exception):
    """Raised when a URL cannot be fetched or contains no usable content."""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((requests.exceptions.ConnectionError, requests.exceptions.Timeout)),
    reraise=True,
)
def _tavily_search(query: str, max_results: int) -> dict:
    _rate_limiter.acquire()
    return _get_tavily_client().search(query=query, max_results=max_results)


@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable information on a topic. Returns titles, URLs and snippets."""
    cache_key = ("search", query, settings.search_max_results)

    def _do_search() -> str:
        try:
            results = _tavily_search(query, settings.search_max_results)
        except Exception as exc:  # noqa: BLE001
            logger.error("web_search failed for %r: %s", query, exc)
            return f"Search failed due to an upstream error: {exc}"

        out = []
        for r in results.get("results", []):
            out.append(f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['content'][:300]}\n")

        if not out:
            return "No search results found."
        return "\n----\n".join(out)

    return _search_cache.cached_call(cache_key, _do_search)


@retry(
    stop=stop_after_attempt(settings.http_max_retries),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((requests.exceptions.ConnectionError, requests.exceptions.Timeout)),
    reraise=True,
)
def _fetch(url: str) -> requests.Response:
    _rate_limiter.acquire()
    response = requests.get(url, headers=_SCRAPE_HEADERS, timeout=settings.scrape_timeout_seconds)
    response.raise_for_status()
    return response


def _extract_content(html: str) -> str | None:
    """Try three extraction strategies in order of quality; return the first that works."""
    extracted = trafilatura.extract(html, include_comments=False, include_tables=False)
    if extracted and len(extracted.strip()) > 200:
        return re.sub(r"\s+", " ", extracted)

    try:
        clean_html = Document(html).summary()
        soup = BeautifulSoup(clean_html, "html.parser")
        for tag in soup(_STRIP_TAGS):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        if text and len(text.strip()) > 200:
            return re.sub(r"\s+", " ", text)
    except Exception as exc:  # noqa: BLE001
        logger.debug("readability extraction failed: %s", exc)

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(_STRIP_TAGS):
        tag.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(separator=" ", strip=True))
    return text or None


def scrape_url_impl(url: str) -> str:
    """Non-decorated implementation so it can be called directly (e.g. concurrently) or wrapped as a tool."""

    def _do_scrape() -> str:
        try:
            response = _fetch(url)
        except requests.exceptions.Timeout as exc:
            raise ScrapeError(f"Timed out fetching {url}") from exc
        except requests.exceptions.HTTPError as exc:
            raise ScrapeError(f"HTTP error fetching {url}: {exc}") from exc
        except Exception as exc:  # noqa: BLE001
            raise ScrapeError(f"Could not fetch {url}: {exc}") from exc

        content = _extract_content(response.text)
        if not content:
            raise ScrapeError(f"Could not extract meaningful content from {url}")
        return content[: settings.scrape_max_chars]

    try:
        return _scrape_cache.cached_call(("scrape", url), _do_scrape)
    except ScrapeError as exc:
        logger.warning(str(exc))
        return str(exc)


@tool
def scrape_url(url: str) -> str:
    """Scrape and extract clean readable content from a URL, with multiple fallback extraction strategies."""
    return scrape_url_impl(url)
