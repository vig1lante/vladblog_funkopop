import logging

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenAIClientConfigError(ValueError):
    pass


def get_openai_client() -> OpenAI:
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        logger.error("openai client unavailable reason=missing_api_key")
        raise OpenAIClientConfigError("OPENAI_API_KEY is required for openai mode")

    logger.debug("openai client created model=%s", settings.OPENAI_IMAGE_MODEL)
    return OpenAI(api_key=api_key)
