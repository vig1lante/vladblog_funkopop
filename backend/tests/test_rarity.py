from unittest.mock import patch

from app.enums.rarity import Rarity
from app.services.figures import format_display_number
from app.services.rarity import roll_rarity


def test_roll_rarity_returns_founder_legendary_for_first_mint() -> None:
    assert roll_rarity(1) == Rarity.FOUNDER_LEGENDARY


def test_roll_rarity_for_other_mints_returns_supported_random_rarity() -> None:
    with patch("app.services.rarity.random.random", return_value=0.10):
        assert roll_rarity(2) == Rarity.RARE
    with patch("app.services.rarity.random.random", return_value=0.80):
        assert roll_rarity(2) == Rarity.EPIC
    with patch("app.services.rarity.random.random", return_value=0.99):
        assert roll_rarity(2) == Rarity.LEGENDARY


def test_format_display_number_pads_until_9999() -> None:
    assert format_display_number(1) == "#0001"
    assert format_display_number(10) == "#0010"
    assert format_display_number(10000) == "#10000"
