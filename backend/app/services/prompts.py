from app.enums.presets import get_preset_label
from app.models.figure import Figure
from app.models.user import User

RARITY_STYLE_PROMPTS = {
    "Rare": "Palette style: pale lavender, violet, soft purple glow.",
    "Epic": "Palette style: pale lavender, violet, soft purple glow.",
    "Mythic": "Palette style: deep black, plasma red, scarlet glow.",
    "Legendary": (
        "Palette style: black, deep charcoal, metallic gold, warm amber glow."
    ),
    "Founder Legendary": (
        "Palette style: black, antique gold, champagne highlights, "
        "dark premium shadows."
    ),
    "Foil": (
        "Palette style: pearlescent white, cyan, pink, lavender, "
        "pale gold holographic reflections. Add a strong visible rainbow foil "
        "sheen across the box frame, badge, label plate, and visible package "
        "edges, like a collectible trading card holo treatment."
    ),
    "Foil Epic": (
        "Palette style: pale lavender, violet, soft purple glow, "
        "with pearlescent cyan, pink, pale gold holographic reflections. Add a "
        "strong visible rainbow foil sheen across the box frame, badge, label "
        "plate, and visible package edges, like a collectible trading card "
        "holo treatment."
    ),
    "Foil Mythic": (
        "Palette style: deep black, plasma red, scarlet glow, with "
        "pearlescent cyan, pink, pale gold holographic reflections. Add a "
        "strong visible rainbow foil sheen across the box frame, badge, label "
        "plate, and visible package edges, like a collectible trading card "
        "holo treatment."
    ),
    "Foil Legendary": (
        "Palette style: black, deep charcoal, metallic gold, warm amber glow, "
        "with pearlescent cyan, pink, pale gold holographic reflections. Add a "
        "strong visible rainbow foil sheen across the box frame, badge, label "
        "plate, and visible package edges, like a collectible trading card "
        "holo treatment."
    ),
    "Foil Founder Legendary": (
        "Palette style: black, antique gold, champagne highlights, dark premium "
        "shadows, with pearlescent cyan, pink, pale gold holographic "
        "reflections. Add a strong visible rainbow foil sheen across the box "
        "frame, badge, label plate, and visible package edges, like a "
        "collectible trading card holo treatment."
    ),
}


def build_rarity_style_prompt(rarity: str) -> str:
    return RARITY_STYLE_PROMPTS.get(rarity, RARITY_STYLE_PROMPTS["Rare"])


def build_telegram_name_prompt(user: User | None) -> str:
    if user is None:
        return "Character name from Telegram: not provided."

    full_name = " ".join(
        part.strip() for part in [user.first_name, user.last_name] if part
    )
    if not full_name:
        username = (user.username or "").strip()
        if username:
            return (
                f"Character name from Telegram: @{username}. Use this as the "
                "figurine identity and small package name label."
            )
        return "Character name from Telegram: not provided."

    return (
        f"Character name from Telegram: {full_name}. Use this as the figurine "
        "identity and include it as one small character name label on the "
        "package, secondary to the collection name and number."
    )


def build_selected_preset_prompt(value: str | None) -> str:
    if not value:
        return "not selected"

    readable_value = value.replace("_", " ")
    label = get_preset_label(value)
    if label == value:
        return readable_value

    return f"{readable_value} ({label}; selected id: {value})"


def build_figure_prompt(
    figure: Figure,
    user: User | None = None,
    *,
    rarity: str | None = None,
) -> str:
    prompt_rarity = rarity or figure.rarity
    if figure.source_photo_type in {"telegram_profile", "uploaded"}:
        photo_instruction = (
            "Use the provided user photo as the main visual reference. Preserve "
            "recognizable high-level traits such as hairstyle, face shape, "
            "glasses if present, beard if present, general vibe and expression, "
            "but convert everything into a stylized Funko Pop collectible toy."
        )
    else:
        photo_instruction = (
            "Do not use a real person reference. Create a fictional stylized "
            "collectible figure based only on the selected presets."
        )

    return "\n".join(
        [
            "Create an image in Funko Pop style: a cute collectible vinyl figure "
            "with an oversized head, small body, simple facial features, and "
            "toy-like proportions.",
            "",
            "The figure is displayed inside a premium retail toy box with a "
            "transparent plastic front window. The box should look like a "
            "fictional collectible series package.",
            "",
            "Collection:",
            '"VLADBLOG COLLECTIBLES"',
            f'Figure number: "{figure.display_number}"',
            build_telegram_name_prompt(user),
            "",
            "User-selected design:",
            f"Theme/vibe: {build_selected_preset_prompt(figure.selected_vibe)}",
            f"Accessory: {build_selected_preset_prompt(figure.selected_accessory)}",
            "Background inside the box: "
            f"{build_selected_preset_prompt(figure.selected_background)}",
            "",
            "Mandatory selected detail rules:",
            "Every selected design detail is mandatory and must be visible in "
            "the final image.",
            "Do not omit the selected theme/vibe, accessory, or background, "
            "even if one detail is subtle.",
            "Show the theme/vibe through the figure outfit, pose, package art, "
            "or scene cues. Show the accessory clearly in the figure's hands, "
            "beside the figure, or attached to the package. Make the selected "
            "background visible inside the box behind the figure.",
            "",
            "Package palette style:",
            build_rarity_style_prompt(prompt_rarity),
            "",
            "Composition:",
            "Centered product shot, full box visible, clean studio lighting, "
            "high-detail 3D render, sharp focus, white or light neutral outer "
            "background.",
            "",
            "Text rules:",
            "Only include:",
            '"VLADBLOG COLLECTIBLES"',
            f'"{figure.display_number}"',
            "the Telegram character name if provided",
            "",
            "Reference rules:",
            photo_instruction,
            "",
            "Do not include phone numbers, addresses, private data, extra random "
            "text, real brand logos, copyrighted characters, weapons, gore, "
            "explicit content, or political symbols.",
        ]
    )
