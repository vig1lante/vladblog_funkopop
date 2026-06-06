import json
import logging
import time
import urllib.request
from typing import Any

from app.core.config import settings
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)

START_TEXT = (
    "Привет! Открой миниаппку VladBlog Collectibles и собери свою фигурку."
)
BUTTON_TEXT = "Открыть миниаппку"


def build_start_reply_markup() -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [
                {
                    "text": BUTTON_TEXT,
                    "web_app": {"url": settings.PUBLIC_FRONTEND_URL},
                }
            ]
        ]
    }


def build_menu_button() -> dict[str, Any]:
    return {
        "type": "web_app",
        "text": "Mini App",
        "web_app": {"url": settings.PUBLIC_FRONTEND_URL},
    }


def main() -> None:
    configure_logging()
    if _bot_disabled():
        logger.warning("telegram bot disabled: TELEGRAM_BOT_TOKEN is not configured")
        return

    _api("deleteWebhook", drop_pending_updates=False)
    _api("setChatMenuButton", menu_button=json.dumps(build_menu_button()))
    logger.info(
        "telegram bot polling started mini_app_url=%s",
        settings.PUBLIC_FRONTEND_URL,
    )

    offset = 0
    while True:
        try:
            updates = _api("getUpdates", offset=offset, timeout=30).get("result", [])
            for update in updates:
                offset = max(offset, int(update["update_id"]) + 1)
                _handle_update(update)
        except Exception:
            logger.exception("telegram bot polling failed")
            time.sleep(3)


def _handle_update(update: dict[str, Any]) -> None:
    message = update.get("message")
    if not isinstance(message, dict):
        return

    text = str(message.get("text") or "")
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if chat_id is None or not text.startswith("/start"):
        return

    _api(
        "sendMessage",
        chat_id=chat_id,
        text=START_TEXT,
        reply_markup=json.dumps(build_start_reply_markup()),
    )


def _api(method: str, **params: object) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"
    request = urllib.request.Request(
        url,
        data=json.dumps(params).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=35) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload.get("ok"):
        raise RuntimeError(f"Telegram API {method} failed")
    return payload


def _bot_disabled() -> bool:
    token = settings.TELEGRAM_BOT_TOKEN.strip()
    return not token or token in {"your_bot_token", "your_bot_token_here"}


if __name__ == "__main__":
    main()
