from unittest.mock import MagicMock, patch

import pytest
import requests

from src.tools.tools import scrape_url_impl, web_search


@pytest.fixture(autouse=True)
def _clear_caches():
    """Each test hits fresh cache instances via module-level patch targets below."""
    yield


def test_web_search_formats_results():
    fake_response = {
        "results": [
            {"title": "A", "url": "https://a.com", "content": "content a" * 50},
            {"title": "B", "url": "https://b.com", "content": "content b" * 50},
        ]
    }
    with patch("src.tools.tools._tavily_search", return_value=fake_response) as mocked:
        out = web_search.invoke({"query": "unique-query-1"})
    mocked.assert_called_once()
    assert "Title: A" in out
    assert "URL: https://a.com" in out
    assert "Title: B" in out


def test_web_search_handles_empty_results():
    with patch("src.tools.tools._tavily_search", return_value={"results": []}):
        out = web_search.invoke({"query": "unique-query-empty"})
    assert out == "No search results found."


def test_web_search_handles_upstream_failure():
    with patch("src.tools.tools._tavily_search", side_effect=RuntimeError("boom")):
        out = web_search.invoke({"query": "unique-query-fail"})
    assert "Search failed" in out


def test_scrape_url_extracts_via_trafilatura():
    html = "<html><body><p>" + ("Meaningful article content. " * 30) + "</p></body></html>"
    mock_response = MagicMock(text=html)
    mock_response.raise_for_status.return_value = None

    with patch("src.tools.tools._fetch", return_value=mock_response), \
         patch("src.tools.tools.trafilatura.extract", return_value="Meaningful article content. " * 30):
        result = scrape_url_impl("https://unique-url-1.example.com")

    assert "Meaningful article content" in result


def test_scrape_url_returns_error_string_on_timeout():
    with patch("src.tools.tools._fetch", side_effect=requests.exceptions.Timeout()):
        result = scrape_url_impl("https://unique-url-timeout.example.com")

    assert "Timed out" in result


def test_scrape_url_returns_error_string_on_http_error():
    with patch("src.tools.tools._fetch", side_effect=requests.exceptions.HTTPError("404")):
        result = scrape_url_impl("https://unique-url-http-error.example.com")

    assert "HTTP error" in result


def test_scrape_url_raises_scrape_error_when_no_content():
    mock_response = MagicMock(text="<html><body></body></html>")
    mock_response.raise_for_status.return_value = None

    with patch("src.tools.tools._fetch", return_value=mock_response), \
         patch("src.tools.tools.trafilatura.extract", return_value=None):
        result = scrape_url_impl("https://unique-url-empty.example.com")

    assert "Could not extract" in result
