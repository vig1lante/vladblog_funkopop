import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import parse_qsl


class TelegramAuthError(Exception):
    pass


def validate_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = 60 * 60 * 24,
) -> dict[str, Any]:
    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("Telegram initData hash is missing")

    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramAuthError("Invalid Telegram initData hash")

    auth_date = values.get("auth_date")
    if not auth_date:
        raise TelegramAuthError("Telegram initData auth_date is missing")
    try:
        auth_timestamp = int(auth_date)
    except ValueError as exc:
        raise TelegramAuthError("Telegram initData auth_date is invalid") from exc

    if int(time.time()) - auth_timestamp > max_age_seconds:
        raise TelegramAuthError("Telegram initData expired")

    raw_user = values.get("user")
    if not raw_user:
        raise TelegramAuthError("Telegram initData user is missing")
    try:
        user_data = json.loads(raw_user)
    except json.JSONDecodeError as exc:
        raise TelegramAuthError("Telegram initData user is invalid") from exc

    if not isinstance(user_data, dict) or "id" not in user_data:
        raise TelegramAuthError("Telegram initData user is invalid")

    return user_data
