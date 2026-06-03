from app.core.config import Settings


def test_cors_origins_parse_from_comma_separated_string() -> None:
    settings = Settings(
        BACKEND_CORS_ORIGINS="http://localhost:5173, http://127.0.0.1:5173"
    )

    assert settings.BACKEND_CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_cors_origins_parse_from_json_list() -> None:
    settings = Settings(
        BACKEND_CORS_ORIGINS='["http://localhost:5173","http://127.0.0.1:5173"]'
    )

    assert settings.BACKEND_CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
