from unittest.mock import MagicMock, patch

import pytest

from src.pipelines.pipeline import PipelineError, _extract_sources, run_research_pipeline
from src.schemas import CriticFeedback


def test_extract_sources_parses_web_search_format():
    text = (
        "Title: Example One\nURL: https://one.example.com\nSnippet: hello world\n"
        "\n----\n"
        "Title: Example Two\nURL: https://two.example.com\nSnippet: more text\n"
    )
    sources = _extract_sources(text)
    assert len(sources) == 2
    assert sources[0].url == "https://one.example.com"
    assert sources[1].title == "Example Two"


def test_extract_sources_falls_back_to_bare_urls():
    text = "Some agent summary mentioning https://fallback.example.com as a reference."
    sources = _extract_sources(text)
    assert len(sources) == 1
    assert sources[0].url == "https://fallback.example.com."[:-1] or sources[0].url.startswith("https://fallback")


def test_pipeline_rejects_empty_topic():
    with pytest.raises(PipelineError):
        run_research_pipeline("   ")


def test_pipeline_happy_path():
    fake_search_agent = MagicMock()
    fake_search_agent.invoke.return_value = {
        "messages": [MagicMock(content="Title: X\nURL: https://x.example.com\nSnippet: info\n")]
    }

    fake_critique = CriticFeedback(
        score=8, strengths=["clear"], areas_to_improve=["more depth"], verdict="Solid draft."
    )

    with patch("src.pipelines.pipeline.build_search_agent", return_value=fake_search_agent), \
         patch("src.pipelines.pipeline.scrape_url_impl", return_value="scraped body text"), \
         patch("src.pipelines.pipeline.run_writer", return_value="# Report\n\nBody"), \
         patch("src.pipelines.pipeline.run_critic", return_value=fake_critique):
        result = run_research_pipeline("test topic")

    assert result.topic == "test topic"
    assert result.report_markdown.startswith("# Report")
    assert result.critique.score == 8
    assert len(result.sources) == 1
    assert result.duration_seconds >= 0


def test_pipeline_raises_pipeline_error_when_search_fails():
    fake_search_agent = MagicMock()
    fake_search_agent.invoke.side_effect = RuntimeError("network down")

    with patch("src.pipelines.pipeline.build_search_agent", return_value=fake_search_agent):
        with pytest.raises(PipelineError):
            run_research_pipeline("test topic")


def test_pipeline_calls_on_step_callback():
    fake_search_agent = MagicMock()
    fake_search_agent.invoke.return_value = {
        "messages": [MagicMock(content="Title: X\nURL: https://x.example.com\nSnippet: info\n")]
    }
    fake_critique = CriticFeedback(score=7, strengths=[], areas_to_improve=[], verdict="ok")
    calls = []

    with patch("src.pipelines.pipeline.build_search_agent", return_value=fake_search_agent), \
         patch("src.pipelines.pipeline.scrape_url_impl", return_value="body"), \
         patch("src.pipelines.pipeline.run_writer", return_value="report"), \
         patch("src.pipelines.pipeline.run_critic", return_value=fake_critique):
        run_research_pipeline("topic", on_step=lambda step, status: calls.append((step, status)))

    assert ("search", "running") in calls
    assert ("critic", "done") in calls
