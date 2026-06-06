from app.bot import BUTTON_TEXT, START_TEXT, build_menu_button, build_start_reply_markup
from app.core.config import settings


def test_start_message_uses_public_frontend_url() -> None:
    markup = build_start_reply_markup()

    button = markup["inline_keyboard"][0][0]
    assert button["text"] == BUTTON_TEXT
    assert button["web_app"]["url"] == settings.PUBLIC_FRONTEND_URL
    assert "миниаппку" in START_TEXT


def test_menu_button_uses_public_frontend_url() -> None:
    button = build_menu_button()

    assert button["type"] == "web_app"
    assert button["web_app"]["url"] == settings.PUBLIC_FRONTEND_URL
