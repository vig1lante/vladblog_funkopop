import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PROJECT_ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

PLACEHOLDER_JWT_SECRET_KEYS = {
    "change_me",
    "changeme",
    "your_jwt_secret",
    "your_jwt_secret_here",
}
PLACEHOLDER_TELEGRAM_BOT_TOKENS = {
    "",
    "your_bot_token",
    "your_bot_token_here",
}
ALLOWED_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
LOG_LEVEL_ALIASES = {"WARN": "WARNING"}


def is_placeholder_jwt_secret(value: str) -> bool:
    stripped = value.strip()
    return (
        stripped in PLACEHOLDER_JWT_SECRET_KEYS
        or stripped.startswith("local_dev_only_")
    )


def is_placeholder_telegram_bot_token(value: str) -> bool:
    return value.strip() in PLACEHOLDER_TELEGRAM_BOT_TOKENS


class Settings(BaseSettings):
    APP_ENV: str = "local"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PROJECT_NAME: str = "VladBlog Collectibles API"
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/vladik_collectibles"
    )
    RESET_DATABASE_ON_START: bool = False
    PUBLIC_FRONTEND_URL: str = "http://localhost:5173"
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173"
    ]
    DEV_AUTH_ENABLED: bool = False
    TELEGRAM_BOT_TOKEN: str = "your_bot_token_here"
    JWT_SECRET_KEY: str = "local_dev_only_jwt_secret_change_me_32"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_PATH: str = "./project_data/media"
    PUBLIC_MEDIA_BASE_URL: str = ""
    GENERATION_ENABLED: bool = True
    GENERATION_MODE: str = "mock"
    GENERATION_BACKGROUND_TASKS: bool = True
    GENERATION_AUDIT_LOG_PATH: str = "./project_data/logs/generation-audit.jsonl"
    OPENAI_API_KEY: str = ""
    OPENAI_IMAGE_MODEL: str = "gpt-image-2"
    OPENAI_IMAGE_SIZE: str = "1024x1024"
    OPENAI_IMAGE_QUALITY: str = "medium"
    OPENAI_IMAGE_MAX_ATTEMPTS: int = 2

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT_ENV_FILE,),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []

            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if not isinstance(parsed, list):
                    raise ValueError("BACKEND_CORS_ORIGINS JSON must be a list")
                return [str(origin).strip() for origin in parsed if str(origin).strip()]

            return [origin.strip() for origin in stripped.split(",") if origin.strip()]

        raise ValueError("BACKEND_CORS_ORIGINS must be a list or string")

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def normalize_log_level(cls, value: Any) -> str:
        raw_level = str(value).strip().upper()
        level = LOG_LEVEL_ALIASES.get(raw_level, raw_level)
        if level not in ALLOWED_LOG_LEVELS:
            raise ValueError(
                "LOG_LEVEL must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL"
            )
        return level

    @model_validator(mode="after")
    def normalize_public_urls(self) -> "Settings":
        self.APP_ENV = self.APP_ENV.strip().lower() or "local"
        self.PUBLIC_FRONTEND_URL = self.PUBLIC_FRONTEND_URL.rstrip("/")
        self.PUBLIC_BACKEND_URL = self.PUBLIC_BACKEND_URL.rstrip("/")
        self.PUBLIC_MEDIA_BASE_URL = (
            self.PUBLIC_MEDIA_BASE_URL.rstrip("/")
            if self.PUBLIC_MEDIA_BASE_URL.strip()
            else f"{self.PUBLIC_BACKEND_URL}/media"
        )

        origins = [*self.BACKEND_CORS_ORIGINS, self.PUBLIC_FRONTEND_URL]
        self.BACKEND_CORS_ORIGINS = list(
            dict.fromkeys(origin for origin in origins if origin)
        )

        if self.APP_ENV != "local":
            jwt_secret = self.JWT_SECRET_KEY.strip()
            if is_placeholder_jwt_secret(jwt_secret) or len(jwt_secret.encode()) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must be a non-placeholder value of at least "
                    "32 bytes outside local"
                )
            if is_placeholder_telegram_bot_token(self.TELEGRAM_BOT_TOKEN):
                raise ValueError(
                    "TELEGRAM_BOT_TOKEN must be configured outside local"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
