import json
from functools import lru_cache
from typing import Annotated, Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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
    TELEGRAM_BOT_TOKEN: str = "your_bot_token_here"
    JWT_SECRET_KEY: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_PATH: str = "./media"
    PUBLIC_MEDIA_BASE_URL: str = ""
    GENERATION_ENABLED: bool = True
    GENERATION_MODE: str = "mock"
    GENERATION_BACKGROUND_TASKS: bool = True
    OPENAI_API_KEY: str = ""
    OPENAI_IMAGE_MODEL: str = "gpt-image-2"
    OPENAI_IMAGE_SIZE: str = "1024x1024"
    OPENAI_IMAGE_QUALITY: str = "medium"
    OPENAI_IMAGE_MAX_ATTEMPTS: int = 2

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
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

    @model_validator(mode="after")
    def normalize_public_urls(self) -> "Settings":
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

        if self.APP_ENV != "local" and not self.JWT_SECRET_KEY.strip():
            raise ValueError("JWT_SECRET_KEY must not be empty outside local")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
