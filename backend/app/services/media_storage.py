from pathlib import Path
from uuid import UUID, uuid4

from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings

CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class LocalMediaStorage:
    def __init__(self, root_path: str | None = None) -> None:
        self.root_path = Path(root_path or settings.LOCAL_STORAGE_PATH)

    def save_figure_photo(self, user_id: UUID, content_type: str, data: bytes) -> str:
        extension = CONTENT_TYPE_EXTENSIONS[content_type]
        directory = self.root_path / "figure-photos"
        directory.mkdir(parents=True, exist_ok=True)

        file_name = f"{user_id}_{uuid4().hex}{extension}"
        file_path = directory / file_name
        file_path.write_bytes(data)

        return (
            f"{settings.PUBLIC_MEDIA_BASE_URL.rstrip('/')}/figure-photos/{file_name}"
        )

    def ensure_mock_generated_figure(
        self,
        display_number: str,
        rarity: str,
    ) -> str:
        directory = self.root_path / "mock"
        directory.mkdir(parents=True, exist_ok=True)
        file_path = directory / "generated-figure.png"

        if not file_path.exists():
            image = Image.new("RGB", (768, 768), "#f8fafc")
            draw = ImageDraw.Draw(image)
            font = ImageFont.load_default()
            lines = [
                "VLADIK COLLECTIBLES",
                display_number,
                rarity,
                "MOCK IMAGE",
            ]
            y = 250
            for line in lines:
                box = draw.textbbox((0, 0), line, font=font)
                x = (768 - (box[2] - box[0])) // 2
                draw.text((x, y), line, fill="#0f172a", font=font)
                y += 52
            image.save(file_path, "PNG")

        return f"{settings.PUBLIC_MEDIA_BASE_URL.rstrip('/')}/mock/generated-figure.png"
