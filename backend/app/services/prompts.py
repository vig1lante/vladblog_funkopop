from app.models.figure import Figure


def build_figure_prompt(figure: Figure) -> str:
    return "\n".join(
        [
            "Create an image in Funko Pop style for VLADIK COLLECTIBLES.",
            f"Figure number: {figure.display_number}",
            f"Rarity: {figure.rarity}",
            f"Color: {figure.selected_color}",
            f"Vibe: {figure.selected_vibe}",
            f"Accessory: {figure.selected_accessory}",
            f"Background: {figure.selected_background}",
            f"Source photo type: {figure.source_photo_type}",
            "Make it look like a premium collectible toy box render.",
        ]
    )
