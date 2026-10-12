from app.core.config import Settings


def test_settings_default_values():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="development",
        DATABASE_URL="postgresql://user:pass@localhost:5432/testdb",
    )
    assert settings.ENVIRONMENT == "development"
    assert settings.effective_port in (8000, 5000)
    assert settings.effective_database_url == "postgresql://user:pass@localhost:5432/testdb"
    assert settings.MAX_PDF_SIZE_BYTES == 25 * 1024 * 1024


def test_settings_explicit_ai_port():
    settings = Settings(
        AI_PORT=8001,
        PORT=5000,
    )
    assert settings.effective_port == 8001


def test_settings_test_environment_url_override():
    settings = Settings(
        ENVIRONMENT="test",
        DATABASE_URL="postgresql://user:pass@localhost:5432/devdb",
        TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/testdb",
    )
    assert settings.effective_database_url == "postgresql://user:pass@localhost:5432/testdb"


def test_settings_log_level_normalization():
    settings = Settings(LOG_LEVEL="debug")
    assert settings.LOG_LEVEL == "DEBUG"
