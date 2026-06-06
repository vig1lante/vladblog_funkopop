from openai import OpenAI

from app.core.config import settings


class OpenAIClientConfigError(ValueError):
    pass


def get_openai_client() -> OpenAI:
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        raise OpenAIClientConfigError("OPENAI_API_KEY is required for openai mode")

    return OpenAI(api_key=api_key)
