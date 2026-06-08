from pathlib import Path

import pytest

from app.core.config import Settings
from app.core.reset_database import should_reset_database


def make_settings(**kwargs: object) -> Settings:
    return Settings(_env_file=None, **kwargs)


def test_settings_load_env_only_from_project_root() -> None:
    project_root_env = Settings.model_config["env_file"]
    expected_env = Path(__file__).resolve().parents[2] / ".env"

    assert isinstance(project_root_env, tuple)
    assert project_root_env == (expected_env,)


def test_cors_origins_parse_from_comma_separated_string() -> None:
    settings = make_settings(
        BACKEND_CORS_ORIGINS="http://localhost:5173, http://127.0.0.1:5173"
    )

    assert settings.BACKEND_CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_public_urls_derive_media_and_cors() -> None:
    settings = make_settings(
        PUBLIC_FRONTEND_URL="https://front.example.com/",
        PUBLIC_BACKEND_URL="https://api.example.com/",
        PUBLIC_MEDIA_BASE_URL="",
        BACKEND_CORS_ORIGINS="http://localhost:5173",
    )

    assert settings.PUBLIC_FRONTEND_URL == "https://front.example.com"
    assert settings.PUBLIC_BACKEND_URL == "https://api.example.com"
    assert settings.PUBLIC_MEDIA_BASE_URL == "https://api.example.com/media"
    assert settings.BACKEND_CORS_ORIGINS == [
        "http://localhost:5173",
        "https://front.example.com",
    ]


def test_default_local_data_paths_live_under_project_root_data_folder() -> None:
    settings = make_settings()

    assert settings.LOCAL_STORAGE_PATH == "./project_data/media"
    assert settings.GENERATION_AUDIT_LOG_PATH == (
        "./project_data/logs/generation-audit.jsonl"
    )


def test_log_level_is_normalized_to_uppercase() -> None:
    settings = make_settings(LOG_LEVEL="debug")

    assert settings.LOG_LEVEL == "DEBUG"


def test_invalid_log_level_is_rejected() -> None:
    with pytest.raises(ValueError, match="LOG_LEVEL"):
        make_settings(LOG_LEVEL="verbose")


def test_cors_origins_parse_from_json_list() -> None:
    settings = make_settings(
        BACKEND_CORS_ORIGINS='["http://localhost:5173","http://127.0.0.1:5173"]'
    )

    assert settings.BACKEND_CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_reset_database_flag_is_dev_only() -> None:
    assert should_reset_database(
        make_settings(RESET_DATABASE_ON_START=True, APP_ENV="local")
    )
    assert not should_reset_database(
        make_settings(
            RESET_DATABASE_ON_START=True,
            APP_ENV="production",
            JWT_SECRET_KEY="x" * 32,
            TELEGRAM_BOT_TOKEN="123456:test-token",
        )
    )
    assert not should_reset_database(make_settings(RESET_DATABASE_ON_START=False))


def test_non_local_env_rejects_placeholder_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        make_settings(
            APP_ENV="production",
            JWT_SECRET_KEY="change_me",
            TELEGRAM_BOT_TOKEN="123456:test-token",
        )


def test_non_local_env_rejects_short_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        make_settings(
            APP_ENV="production",
            JWT_SECRET_KEY="too-short",
            TELEGRAM_BOT_TOKEN="123456:test-token",
        )


def test_non_local_env_rejects_placeholder_telegram_bot_token() -> None:
    with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN"):
        make_settings(
            APP_ENV="production",
            JWT_SECRET_KEY="x" * 32,
            TELEGRAM_BOT_TOKEN="your_bot_token",
        )


def test_non_local_env_accepts_configured_auth_secrets() -> None:
    settings = make_settings(
        APP_ENV="production",
        JWT_SECRET_KEY="x" * 32,
        TELEGRAM_BOT_TOKEN="123456:test-token",
    )

    assert settings.APP_ENV == "production"
