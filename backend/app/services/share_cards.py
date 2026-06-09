from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageChops, ImageDraw, ImageFont

from app.core.config import settings
from app.enums.presets import get_preset_label
from app.models.figure import Figure
from app.models.user import User

CARD_WIDTH = 1200
CARD_HEIGHT = 1720
CARD_PADDING = 72
IMAGE_SIZE = 960

RARITY_DROP_RATES = {
    "Epic": "55%",
    "Mythic": "24%",
    "Legendary": "8%",
    "Founder Legendary": "4%",
    "Foil Epic": "5%",
    "Foil Mythic": "2.5%",
    "Foil Legendary": "1%",
    "Foil Founder Legendary": "0.5%",
}

RARITY_COLORS = {
    "Epic": ("#e9d5ff", "#8b5cf6"),
    "Mythic": ("#ffe4e6", "#e11d48"),
    "Legendary": ("#fde68a", "#f59e0b"),
    "Founder Legendary": ("#1d4ed8", "#020a3a"),
    "Foil Epic": ("#f1d8ff", "#8b5cf6"),
    "Foil Mythic": ("#ffe4e6", "#e11d48"),
    "Foil Legendary": ("#fde68a", "#f59e0b"),
    "Foil Founder Legendary": ("#1d4ed8", "#020a3a"),
}

FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
)


def render_figure_share_card(
    figure: Figure,
    user: User,
    *,
    image_url: str | None = None,
    rarity: str | None = None,
) -> bytes:
    card_rarity = rarity or figure.rarity
    accent, accent_2 = RARITY_COLORS.get(card_rarity, RARITY_COLORS["Legendary"])
    image = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), "#0b0b12")
    draw = ImageDraw.Draw(image)

    card_box = (
        CARD_PADDING,
        CARD_PADDING,
        CARD_WIDTH - CARD_PADDING,
        CARD_HEIGHT - CARD_PADDING,
    )
    _draw_card_background(image, card_box, accent, accent_2)

    image_box = (
        CARD_PADDING + 48,
        CARD_PADDING + 48,
        CARD_PADDING + 48 + IMAGE_SIZE,
        CARD_PADDING + 48 + IMAGE_SIZE,
    )
    figure_image = _load_figure_image(image_url or figure.image_url)
    if figure_image is not None:
        _paste_cover(image, figure_image, image_box, radius=50)
    else:
        draw.rounded_rectangle(
            image_box,
            radius=50,
            fill="#242432",
            outline="#4b4b58",
            width=3,
        )
        _draw_centered_text(
            draw,
            "Изображение недоступно",
            (CARD_WIDTH // 2, image_box[1] + IMAGE_SIZE // 2),
            _font(46, bold=True),
            "#f5f5f7",
        )

    content_y = image_box[3] + 84
    _draw_centered_text(
        draw,
        figure.display_number,
        (CARD_WIDTH // 2, content_y),
        _font(88, bold=True),
        accent,
    )
    _draw_rarity_pill(draw, card_rarity.upper(), content_y + 100, accent, accent_2)
    _draw_attributes(
        draw,
        [
            ("Модель", _user_label(user)),
            ("Редкость", RARITY_DROP_RATES.get(card_rarity, "Неизвестно")),
            ("Вайб", _preset_label(figure.selected_vibe)),
            ("Аксессуар", _preset_label(figure.selected_accessory)),
            ("Фон", _preset_label(figure.selected_background)),
        ],
    )

    buffer = BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def _load_figure_image(image_url: str | None) -> Image.Image | None:
    image_path = _local_media_path(image_url)
    if image_path is None or not image_path.exists():
        return None

    try:
        with Image.open(image_path) as source:
            return source.convert("RGB")
    except OSError:
        return None


def _local_media_path(image_url: str | None) -> Path | None:
    if not image_url:
        return None

    parsed = urlparse(image_url)
    public_base = urlparse(settings.PUBLIC_MEDIA_BASE_URL.rstrip("/"))
    relative_path: str | None = None

    if parsed.scheme and parsed.netloc:
        if parsed.scheme != public_base.scheme or parsed.netloc != public_base.netloc:
            return None
        base_path = public_base.path.rstrip("/")
        if not parsed.path.startswith(f"{base_path}/"):
            return None
        relative_path = parsed.path[len(base_path) :].lstrip("/")
    elif parsed.path.startswith("/media/"):
        relative_path = parsed.path.removeprefix("/media/")
    else:
        relative_path = parsed.path.lstrip("/")

    root = Path(settings.LOCAL_STORAGE_PATH).resolve()
    candidate = (root / relative_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


def _paste_cover(
    canvas: Image.Image,
    source: Image.Image,
    box: tuple[int, int, int, int],
    *,
    radius: int,
) -> None:
    width = box[2] - box[0]
    height = box[3] - box[1]
    scale = max(width / source.width, height / source.height)
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = max((resized.width - width) // 2, 0)
    top = max((resized.height - height) // 2, 0)
    cropped = resized.crop((left, top, left + width, top + height))
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, width, height),
        radius=radius,
        fill=255,
    )
    canvas.paste(cropped, box[:2], mask)
    ImageDraw.Draw(canvas).rounded_rectangle(
        box,
        radius=radius,
        outline="#ffffff",
        width=3,
    )


def _draw_card_background(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    accent: str,
    accent_2: str,
) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    effects = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    mask = Image.new("L", canvas.size, 0)
    layer_draw = ImageDraw.Draw(layer)
    effects_draw = ImageDraw.Draw(effects)
    mask_draw = ImageDraw.Draw(mask)
    radius = 72

    mask_draw.rounded_rectangle(box, radius=radius, fill=255)
    layer_draw.rounded_rectangle(box, radius=radius, fill="#171720")
    effects_draw.rounded_rectangle(
        (box[0] + 28, box[1] + 28, box[2] - 28, box[3] - 28),
        radius=radius - 22,
        outline=_rgba(accent, 28),
        width=8,
    )
    effects_draw.polygon(
        [
            (box[0] + 360, box[1]),
            (box[0] + 430, box[1]),
            (box[2] - 410, box[1] + 1270),
            (box[2] - 500, box[1] + 1270),
        ],
        fill=(255, 255, 255, 8),
    )
    effects_draw.polygon(
        [
            (box[0] + 560, box[1]),
            (box[0] + 630, box[1]),
            (box[2] - 240, box[1] + 1270),
            (box[2] - 330, box[1] + 1270),
        ],
        fill=_rgba(accent_2, 8),
    )
    effects.putalpha(ImageChops.multiply(effects.getchannel("A"), mask))
    layer.alpha_composite(effects)
    canvas.alpha_composite(layer)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(box, radius=radius, outline=accent, width=4)
    draw.rounded_rectangle(
        (box[0] + 7, box[1] + 7, box[2] - 7, box[3] - 7),
        radius=radius - 8,
        outline=(255, 255, 255),
        width=1,
    )


def _draw_rarity_pill(
    draw: ImageDraw.ImageDraw,
    text: str,
    center_y: int,
    accent: str,
    accent_2: str,
) -> None:
    font = _font(36, bold=True)
    text_box = draw.textbbox((0, 0), text, font=font)
    width = min(text_box[2] - text_box[0] + 92, 760)
    height = 70
    x = (CARD_WIDTH - width) // 2
    y = center_y - height // 2
    draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=38,
        fill=accent,
        outline=accent_2,
        width=3,
    )
    _draw_centered_text(draw, text, (CARD_WIDTH // 2, center_y), font, "#111118")


def _draw_attributes(draw: ImageDraw.ImageDraw, rows: list[tuple[str, str]]) -> None:
    label_font = _font(27, bold=True)
    value_font = _font(31, bold=True)
    panel = (
        CARD_PADDING + 66,
        1310,
        CARD_WIDTH - CARD_PADDING - 66,
        CARD_HEIGHT - CARD_PADDING - 74,
    )
    draw.rounded_rectangle(
        panel,
        radius=34,
        fill="#10101a",
        outline="#4b3c64",
        width=2,
    )

    for box, (label, value) in zip(_attribute_row_boxes(len(rows)), rows, strict=True):
        _draw_attribute_row(draw, box, label, value, label_font, value_font)


def _attribute_row_boxes(count: int) -> list[tuple[int, int, int, int]]:
    panel = (
        CARD_PADDING + 66,
        1310,
        CARD_WIDTH - CARD_PADDING - 66,
        CARD_HEIGHT - CARD_PADDING - 74,
    )
    inner_x = 28
    inner_y = 26
    gap = 10
    available_height = panel[3] - panel[1] - inner_y * 2
    row_height = (available_height - gap * (count - 1)) // count
    left = panel[0] + inner_x
    right = panel[2] - inner_x
    top = panel[1] + inner_y
    return [
        (
            left,
            top + index * (row_height + gap),
            right,
            top + index * (row_height + gap) + row_height,
        )
        for index in range(count)
    ]


def _draw_attribute_row(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    label: str,
    value: str,
    label_font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    value_font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> None:
    draw.rounded_rectangle(
        box,
        radius=22,
        fill="#1b1b27",
        outline="#343044",
        width=1,
    )
    text_x = box[0] + 22
    center_y = (box[1] + box[3]) // 2
    label_box = draw.textbbox((0, 0), label, font=label_font)
    draw.text(
        (text_x, center_y - (label_box[3] - label_box[1]) / 2 - label_box[1]),
        label,
        fill="#aaa4bb",
        font=label_font,
    )

    right_x = box[2] - 22
    max_width = max(right_x - (text_x + 250), 360)
    fitted_value_font = _fit_value_font(draw, value, max_width, start_size=31)
    fitted_value = _fit_text(draw, value, fitted_value_font, max_width)
    value_box = draw.textbbox((0, 0), fitted_value, font=fitted_value_font)
    draw.text(
        (
            right_x - (value_box[2] - value_box[0]),
            center_y - (value_box[3] - value_box[1]) / 2 - value_box[1],
        ),
        fitted_value,
        fill="#ffffff",
        font=fitted_value_font,
    )


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    center: tuple[int, int],
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
) -> None:
    draw.text(
        _centered_text_origin(draw, text, center, font),
        text,
        fill=fill,
        font=font,
    )


def _centered_text_origin(
    draw: ImageDraw.ImageDraw,
    text: str,
    center: tuple[int, int],
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> tuple[float, float]:
    box = draw.textbbox((0, 0), text, font=font)
    return (
        center[0] - (box[0] + box[2]) / 2,
        center[1] - (box[1] + box[3]) / 2,
    )


def _fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: int,
) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text

    trimmed = text
    while len(trimmed) > 1 and draw.textlength(f"{trimmed}...", font=font) > max_width:
        trimmed = trimmed[:-1]
    return f"{trimmed}..."


def _fit_value_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    *,
    start_size: int = 32,
    min_size: int = 24,
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for size in range(start_size, min_size - 1, -1):
        font = _font(size, bold=True)
        if draw.textlength(text, font=font) <= max_width:
            return font
    return _font(min_size, bold=True)


def _font(
    size: int,
    *,
    bold: bool = False,
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = FONT_CANDIDATES if bold else tuple(
        path for path in FONT_CANDIDATES if "Bold" not in path
    ) + FONT_CANDIDATES

    for path in paths:
        font_path = Path(path)
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default(size=size)


def _preset_label(value: str | None) -> str:
    return get_preset_label(value)


def _user_label(user: User) -> str:
    if user.username:
        return f"@{user.username}"
    return user.first_name or "Юзернейм не указан"


def _rgba(hex_color: str, alpha: int) -> tuple[int, int, int, int]:
    value = hex_color.removeprefix("#")
    red = int(value[0:2], 16)
    green = int(value[2:4], 16)
    blue = int(value[4:6], 16)
    return red, green, blue, alpha
