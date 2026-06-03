from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings


class InvalidTokenError(Exception):
    pass


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Invalid access token") from exc

    if not payload.get("sub"):
        raise InvalidTokenError("Invalid access token subject")

    return payload
