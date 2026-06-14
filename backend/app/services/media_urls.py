from urllib.parse import urlparse

from app.core.config import settings

MEDIA_URL_PREFIX = "/media/"


def build_media_url(relative_path: str) -> str:
    path = relative_path.strip().lstrip("/")
    if path.startswith(MEDIA_URL_PREFIX.lstrip("/")):
        return f"/{path}"
    return f"{MEDIA_URL_PREFIX}{path}"


def local_media_relative_path(media_url: str | None) -> str | None:
    if not media_url:
        return None

    parsed = urlparse(media_url)
    public_base = urlparse(settings.PUBLIC_MEDIA_BASE_URL.rstrip("/"))
    public_base_path = public_base.path.rstrip("/")
    path = parsed.path if parsed.scheme or parsed.netloc else media_url

    if parsed.scheme and not parsed.netloc:
        return None

    if parsed.scheme and parsed.netloc:
        if public_base_path and path.startswith(f"{public_base_path}/"):
            return path[len(public_base_path) :].lstrip("/")
        if path.startswith(MEDIA_URL_PREFIX):
            return path.removeprefix(MEDIA_URL_PREFIX)
        return None

    if path.startswith(MEDIA_URL_PREFIX):
        return path.removeprefix(MEDIA_URL_PREFIX)

    return path.lstrip("/") or None


def public_media_url(media_url: str | None) -> str | None:
    relative_path = local_media_relative_path(media_url)
    if relative_path is None:
        return media_url

    return f"{settings.PUBLIC_MEDIA_BASE_URL.rstrip('/')}/{relative_path}"
