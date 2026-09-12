import pytest
from pydantic import ValidationError

from src.config import Settings


def test_settings_load_from_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("TAVILY_API_KEY", "tv-test")
    s = Settings(_env_file=None)
    assert s.openai_api_key == "sk-test"
    assert s.tavily_api_key == "tv-test"
    assert s.llm_model == "gpt-4o-mini"


def test_settings_requires_api_keys(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_invalid_temperature_rejected(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("TAVILY_API_KEY", "tv-test")
    monkeypatch.setenv("LLM_TEMPERATURE", "5.0")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_invalid_log_level_rejected(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("TAVILY_API_KEY", "tv-test")
    monkeypatch.setenv("LOG_LEVEL", "NOT_A_LEVEL")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
