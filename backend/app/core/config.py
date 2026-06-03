import json
from functools import lru_cache
from typing import Annotated, Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "local"
    DEBUG: bool = True
    PROJECT_NAME: str = "Vladik Collectibles API"
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/vladik_collectibles"
    )
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173"
    ]
    TELEGRAM_BOT_TOKEN: str = "your_bot_token_here"
    JWT_SECRET_KEY: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_PATH: str = "./media"
    PUBLIC_MEDIA_BASE_URL: str = "http://localhost:8000/media"
    GENERATION_MODE: str = "mock"

    model_config = SettingsConfigDict(
        env_file=".env",
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
    def validate_production_secrets(self) -> "Settings":
        if self.APP_ENV != "local" and not self.JWT_SECRET_KEY.strip():
            raise ValueError("JWT_SECRET_KEY must not be empty outside local")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
