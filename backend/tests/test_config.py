from app.core.config import Settings
from app.core.reset_database import should_reset_database


def make_settings(**kwargs: object) -> Settings:
    return Settings(_env_file=None, **kwargs)


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
        make_settings(RESET_DATABASE_ON_START=True, APP_ENV="production")
    )
    assert not should_reset_database(make_settings(RESET_DATABASE_ON_START=False))
