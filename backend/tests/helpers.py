import hashlib
import hmac
import json
import time
from urllib.parse import urlencode


def build_telegram_init_data(
    *,
    bot_token: str,
    user: dict | None,
    auth_date: int | None = None,
    tamper_hash: bool = False,
) -> str:
    values = {
        "auth_date": str(auth_date or int(time.time())),
        "query_id": "test-query-id",
    }
    if user is not None:
        values["user"] = json.dumps(user, separators=(",", ":"))
    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()
    digest = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    values["hash"] = "bad" + digest[3:] if tamper_hash else digest

    return urlencode(values)
