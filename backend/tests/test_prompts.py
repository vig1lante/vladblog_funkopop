from app.models.figure import Figure
from app.models.user import User
from app.services.prompts import (
    build_figure_prompt,
    build_rarity_style_prompt,
    build_telegram_name_prompt,
)


def make_prompt_figure(source_photo_type: str = "none") -> Figure:
    return Figure(
        display_number="#0001",
        rarity="Founder Legendary",
        selected_color="gold",
        selected_vibe="cyberpunk",
        selected_accessory="laptop",
        selected_background="neon_server_room",
        source_photo_type=source_photo_type,
    )


def test_build_figure_prompt_uses_safe_collectible_package_template() -> None:
    prompt = build_figure_prompt(
        make_prompt_figure(),
        User(first_name="Vlad", last_name="Blog", telegram_id=123),
    )

    assert "Create an image in Funko Pop style" in prompt
    assert '"VLADBLOG COLLECTIBLES"' in prompt
    assert 'Figure number: "#0001"' in prompt
    assert "Theme/vibe: cyberpunk" in prompt
    assert "Character name from Telegram: Vlad Blog" in prompt
    assert "small character name label" in prompt
    assert "Founder Legendary" not in prompt
    assert "Main color:" not in prompt
    assert "Package palette style:" in prompt
    assert "Only include:" in prompt
    assert "the Telegram character name if provided" in prompt
    assert "Do not use a real person reference" in prompt
    assert "Do not include phone numbers" in prompt
    assert "octagon" not in prompt.lower()
    assert "standalone digit" not in prompt.lower()


def test_build_figure_prompt_makes_each_selected_preset_mandatory() -> None:
    figure = make_prompt_figure()
    figure.selected_vibe = "streamer"
    figure.selected_accessory = "dice_set"
    figure.selected_background = "jazz_club"

    prompt = build_figure_prompt(figure)

    assert "Theme/vibe: streamer (Стример" in prompt
    assert "Accessory: dice set (Набор кубиков" in prompt
    assert "Background inside the box: jazz club (Джаз-клуб" in prompt
    assert "Every selected design detail is mandatory" in prompt
    assert "Do not omit the selected theme/vibe, accessory, or background" in prompt


def test_build_figure_prompt_adds_reference_photo_instruction() -> None:
    prompt = build_figure_prompt(make_prompt_figure("uploaded"))

    assert "Use the provided user photo as the main visual reference" in prompt
    assert "Preserve recognizable high-level traits" in prompt


def test_build_rarity_style_prompt_returns_specific_layers() -> None:
    epic_prompt = build_rarity_style_prompt("Epic")
    legacy_epic_prompt = build_rarity_style_prompt("Rare")
    mythic_prompt = build_rarity_style_prompt("Mythic")
    legendary_prompt = build_rarity_style_prompt("Legendary")
    founder_prompt = build_rarity_style_prompt("Founder Legendary")
    foil_prompt = build_rarity_style_prompt("Foil")
    foil_epic_prompt = build_rarity_style_prompt("Foil Epic")
    foil_mythic_prompt = build_rarity_style_prompt("Foil Mythic")
    foil_legendary_prompt = build_rarity_style_prompt("Foil Legendary")
    foil_founder_prompt = build_rarity_style_prompt("Foil Founder Legendary")

    assert "Palette style" in epic_prompt
    assert "violet" in epic_prompt
    assert "triangle" not in epic_prompt
    assert legacy_epic_prompt == epic_prompt
    assert "plasma red" in mythic_prompt
    assert "diamond" not in mythic_prompt
    assert "metallic gold" in legendary_prompt
    assert "octagon" not in legendary_prompt.lower()
    assert "antique gold" in founder_prompt
    assert "crest" not in founder_prompt.lower()
    assert "holographic reflections" in foil_prompt
    assert "strong visible rainbow foil sheen" in foil_prompt
    assert "box frame, badge, label plate, and visible package edges" in foil_prompt
    assert "sparkle" not in foil_prompt.lower()
    assert "violet" in foil_epic_prompt
    assert "holographic reflections" in foil_epic_prompt
    assert "plasma red" in foil_mythic_prompt
    assert "holographic reflections" in foil_mythic_prompt
    assert "strong visible rainbow foil sheen" in foil_mythic_prompt
    assert "metallic gold" in foil_legendary_prompt
    assert "holographic reflections" in foil_legendary_prompt
    assert "antique gold" in foil_founder_prompt
    assert "holographic reflections" in foil_founder_prompt


def test_build_telegram_name_prompt_skips_empty_name() -> None:
    assert "not provided" in build_telegram_name_prompt(
        User(first_name=None, last_name=None, telegram_id=123)
    )
