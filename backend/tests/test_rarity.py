from app.enums.rarity import Rarity
from app.services.figures import format_display_number
from app.services.rarity import roll_rarity


def test_roll_rarity_temporarily_returns_legendary_for_all_mints() -> None:
    assert roll_rarity(1) == Rarity.LEGENDARY
    assert roll_rarity(2) == Rarity.LEGENDARY


def test_format_display_number_pads_until_9999() -> None:
    assert format_display_number(1) == "#0001"
    assert format_display_number(10) == "#0010"
    assert format_display_number(10000) == "#10000"
