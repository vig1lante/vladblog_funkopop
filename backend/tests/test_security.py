from uuid import uuid4

import pytest

from app.core.config import settings
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
)

TEST_JWT_SECRET = "x" * 32


@pytest.fixture(autouse=True)
def _configure_test_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", TEST_JWT_SECRET)


def test_create_and_decode_access_token() -> None:
    user_id = str(uuid4())

    token = create_access_token(subject=user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == user_id
    assert "exp" in payload


def test_decode_access_token_rejects_invalid_token() -> None:
    with pytest.raises(InvalidTokenError):
        decode_access_token("not-a-jwt")
