"""
Centralized, validated application configuration.

All environment-driven settings live here so the rest of the codebase never
touches `os.environ` directly. Fails fast at startup with a clear error if
required secrets are missing, instead of surfacing a cryptic auth error deep
inside a LangChain call.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Required secrets -------------------------------------------------
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    tavily_api_key: str = Field(..., alias="TAVILY_API_KEY")

    # --- LLM behaviour ------------------------------------------------------
    llm_model: str = Field("gpt-4o-mini", alias="LLM_MODEL")
    llm_temperature: float = Field(0.0, alias="LLM_TEMPERATURE")
    llm_timeout_seconds: int = Field(60, alias="LLM_TIMEOUT_SECONDS")
    llm_max_retries: int = Field(3, alias="LLM_MAX_RETRIES")

    # --- Search / scrape behaviour -----------------------------------------
    search_max_results: int = Field(5, alias="SEARCH_MAX_RESULTS")
    scrape_max_urls: int = Field(3, alias="SCRAPE_MAX_URLS")
    scrape_timeout_seconds: int = Field(15, alias="SCRAPE_TIMEOUT_SECONDS")
    scrape_max_chars: int = Field(5000, alias="SCRAPE_MAX_CHARS")
    http_max_retries: int = Field(3, alias="HTTP_MAX_RETRIES")

    # --- Caching / rate limiting --------------------------------------------
    cache_ttl_seconds: int = Field(3600, alias="CACHE_TTL_SECONDS")
    rate_limit_calls_per_minute: int = Field(30, alias="RATE_LIMIT_CALLS_PER_MINUTE")

    # --- Ops ------------------------------------------------------------------
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    log_json: bool = Field(False, alias="LOG_JSON")
    environment: str = Field("development", alias="ENVIRONMENT")

    @field_validator("llm_temperature")
    @classmethod
    def _validate_temperature(cls, v: float) -> float:
        if not 0.0 <= v <= 2.0:
            raise ValueError("llm_temperature must be between 0.0 and 2.0")
        return v

    @field_validator("log_level")
    @classmethod
    def _validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        v = v.upper()
        if v not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load settings once per process; cached so repeated calls are free."""
    return Settings()