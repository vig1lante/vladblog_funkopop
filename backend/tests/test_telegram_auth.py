import time

import pytest

from app.core.telegram_auth import TelegramAuthError, validate_telegram_init_data
from tests.helpers import build_telegram_init_data

BOT_TOKEN = "test-bot-token"


def test_validate_telegram_init_data_returns_user_for_valid_payload() -> None:
    init_data = build_telegram_init_data(
        bot_token=BOT_TOKEN,
        user={
            "id": 123456,
            "username": "vlad",
            "first_name": "Vlad",
            "is_premium": True,
        },
    )

    result = validate_telegram_init_data(init_data, BOT_TOKEN)

    assert result == {
        "id": 123456,
        "username": "vlad",
        "first_name": "Vlad",
        "is_premium": True,
    }


def test_validate_telegram_init_data_rejects_invalid_hash() -> None:
    init_data = build_telegram_init_data(
        bot_token=BOT_TOKEN,
        user={"id": 123456, "first_name": "Vlad"},
        tamper_hash=True,
    )

    with pytest.raises(TelegramAuthError, match="Invalid Telegram initData hash"):
        validate_telegram_init_data(init_data, BOT_TOKEN)


def test_validate_telegram_init_data_rejects_expired_auth_date() -> None:
    init_data = build_telegram_init_data(
        bot_token=BOT_TOKEN,
        user={"id": 123456, "first_name": "Vlad"},
        auth_date=int(time.time()) - 60 * 60 * 25,
    )

    with pytest.raises(TelegramAuthError, match="Telegram initData expired"):
        validate_telegram_init_data(init_data, BOT_TOKEN)


def test_validate_telegram_init_data_rejects_missing_user() -> None:
    init_data = build_telegram_init_data(
        bot_token=BOT_TOKEN,
        user=None,
    )

    with pytest.raises(TelegramAuthError, match="Telegram initData user is missing"):
        validate_telegram_init_data(init_data, BOT_TOKEN)
