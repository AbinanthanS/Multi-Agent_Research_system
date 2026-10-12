from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the SciResearch AI service."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: Literal["development", "test", "production"] = Field(
        default="development",
        description="Operating environment name",
    )
    AI_PORT: int | None = Field(default=None, description="Explicit AI service port")
    PORT: int = Field(default=8000, ge=1024, le=65535)
    HOST: str = Field(default="0.0.0.0")
    LOG_LEVEL: str = Field(default="INFO")

    # Database URLs
    DATABASE_URL: str | None = Field(default=None)
    TEST_DATABASE_URL: str | None = Field(default=None)

    # Document processing constraints
    MAX_PDF_SIZE_BYTES: int = Field(
        default=25 * 1024 * 1024,  # 25MB
        description="Maximum allowed PDF download size in bytes",
    )
    PDF_DOWNLOAD_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="HTTP download timeout in seconds",
    )

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def normalize_log_level(cls, v: str) -> str:
        if isinstance(v, str):
            return v.upper()
        return "INFO"

    @property
    def effective_port(self) -> int:
        """Resolve active port, preferring AI_PORT over shared PORT."""
        if self.AI_PORT is not None:
            return self.AI_PORT
        return self.PORT

    @property
    def effective_database_url(self) -> str | None:
        """Resolve the active database URL based on the current environment."""
        if self.ENVIRONMENT == "test" and self.TEST_DATABASE_URL:
            return self.TEST_DATABASE_URL
        return self.DATABASE_URL

    @property
    def max_pdf_size_bytes(self) -> int:
        """Maximum allowed PDF download size in bytes."""
        return self.MAX_PDF_SIZE_BYTES

    @property
    def download_timeout_secs(self) -> int:
        """HTTP download timeout in seconds."""
        return self.PDF_DOWNLOAD_TIMEOUT_SECONDS


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton instance of Settings."""
    return Settings()
