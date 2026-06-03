import struct
import zlib
from collections.abc import AsyncGenerator
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_async_session
from app.main import app
from app.models.figure import Figure
from app.models.generation_job import GenerationJob
from tests.helpers import build_telegram_init_data


@pytest.fixture()
async def session_maker() -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    yield async_sessionmaker(engine, expire_on_commit=False)

    await engine.dispose()


@pytest.fixture()
def client(session_maker: async_sessionmaker[AsyncSession]) -> TestClient:
    async def session_override() -> AsyncGenerator[AsyncSession, None]:
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_async_session] = session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def png_bytes(width: int, height: int) -> bytes:
    raw_rows = b"".join(
        b"\x00" + (b"\x7f\x53\xff" * width) for _ in range(height)
    )

    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        payload = chunk_type + data
        return (
            struct.pack(">I", len(data))
            + payload
            + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw_rows))
        + chunk(b"IEND", b"")
    )


def build_init_data(
    telegram_id: int = 123456,
    first_name: str = "Vlad",
    photo_url: str | None = None,
) -> str:
    telegram_user = {
        "id": telegram_id,
        "username": f"user{telegram_id}",
        "first_name": first_name,
        "language_code": "ru",
        "is_premium": False,
    }
    if photo_url is not None:
        telegram_user["photo_url"] = photo_url

    return build_telegram_init_data(
        bot_token=settings.TELEGRAM_BOT_TOKEN,
        user=telegram_user,
    )


def auth_headers(
    client: TestClient,
    telegram_id: int = 123456,
    photo_url: str | None = None,
) -> dict[str, str]:
    response = client.post(
        "/auth/telegram",
        json={
            "init_data": build_init_data(
                telegram_id=telegram_id,
                photo_url=photo_url,
            )
        },
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def count_figures(session_maker: async_sessionmaker[AsyncSession]) -> int:
    async with session_maker() as session:
        result = await session.execute(select(Figure))
        return len(result.scalars().all())


async def count_user_figures(
    session_maker: async_sessionmaker[AsyncSession],
    user_id: str,
) -> int:
    async with session_maker() as session:
        result = await session.execute(
            select(Figure).where(Figure.user_id == UUID(user_id))
        )
        return len(result.scalars().all())


async def count_generation_jobs(
    session_maker: async_sessionmaker[AsyncSession],
) -> int:
    async with session_maker() as session:
        result = await session.execute(select(GenerationJob))
        return len(result.scalars().all())


def make_ready_figure(client: TestClient, headers: dict[str, str]) -> None:
    client.post("/figures/me", headers=headers)
    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "none",
            "is_public": True,
        },
    )
    assert response.status_code == 200


def test_get_my_figure_without_figure_returns_404(client: TestClient) -> None:
    response = client.get("/figures/me", headers=auth_headers(client))

    assert response.status_code == 404
    assert response.json() == {"detail": "Figure not found"}


@pytest.mark.asyncio
async def test_post_figures_me_creates_founder_figure_for_current_user(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    headers = auth_headers(client)

    response = client.post("/figures/me", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["mint_number"] == 1
    assert payload["display_number"] == "#0001"
    assert payload["rarity"] == "Founder Legendary"
    assert payload["status"] == "draft"
    assert payload["image_url"] is None
    assert await count_figures(session_maker) == 1


@pytest.mark.asyncio
async def test_post_figures_me_is_idempotent_for_same_user(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    headers = auth_headers(client)

    first = client.post("/figures/me", headers=headers)
    second = client.post("/figures/me", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert second.json()["rarity"] == first.json()["rarity"]
    assert await count_figures(session_maker) == 1


def test_get_my_figure_returns_existing_figure(client: TestClient) -> None:
    headers = auth_headers(client)
    created = client.post("/figures/me", headers=headers).json()

    response = client.get("/figures/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


@pytest.mark.asyncio
async def test_one_user_cannot_have_two_figures(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    headers = auth_headers(client)
    first = client.post("/figures/me", headers=headers).json()
    user_id = first["user_id"]

    second = client.post("/figures/me", headers=headers).json()

    assert second["id"] == first["id"]
    assert await count_user_figures(session_maker, user_id) == 1


def test_auth_telegram_returns_existing_figure(client: TestClient) -> None:
    headers = auth_headers(client)
    created = client.post("/figures/me", headers=headers).json()

    response = client.post("/auth/telegram", json={"init_data": build_init_data()})

    assert response.status_code == 200
    assert response.json()["figure"]["id"] == created["id"]


def test_get_figure_presets_returns_available_options(client: TestClient) -> None:
    response = client.get("/figures/presets")

    assert response.status_code == 200
    payload = response.json()
    assert payload["colors"][0] == {"value": "red", "label": "Красный"}
    assert payload["source_photo_types"][0]["value"] == "telegram_profile"
    assert [option["value"] for option in payload["source_photo_types"]] == [
        "telegram_profile",
        "uploaded",
        "none",
    ]


def test_patch_presets_without_figure_returns_404(client: TestClient) -> None:
    response = client.patch(
        "/figures/me/presets",
        headers=auth_headers(client),
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
            "is_public": True,
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Figure not found"}


def test_patch_presets_validates_enum_values(client: TestClient) -> None:
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "pink",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
            "is_public": True,
        },
    )

    assert response.status_code == 422


def test_patch_presets_updates_figure_and_marks_ready(client: TestClient) -> None:
    telegram_photo_url = "https://cdn.telegram.example/avatar.jpg"
    headers = auth_headers(client, photo_url=telegram_photo_url)
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
            "is_public": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_color"] == "purple"
    assert payload["selected_vibe"] == "cyberpunk"
    assert payload["selected_accessory"] == "laptop"
    assert payload["selected_background"] == "neon_server_room"
    assert payload["source_photo_type"] == "telegram_profile"
    assert payload["source_photo_url"] == telegram_photo_url
    assert payload["is_public"] is False
    assert payload["status"] == "ready_for_generation"


def test_patch_presets_rejects_telegram_photo_when_user_has_no_photo(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
            "is_public": True,
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Telegram profile photo is not available"}


def test_patch_presets_can_select_no_photo(client: TestClient) -> None:
    headers = auth_headers(client, photo_url="https://cdn.telegram.example/avatar.jpg")
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "none",
            "is_public": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["source_photo_type"] == "none"
    assert response.json()["source_photo_url"] is None


def test_upload_figure_photo_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/uploads/figure-photo",
        files={"file": ("figure.png", png_bytes(300, 300), "image/png")},
    )

    assert response.status_code == 401


def test_upload_figure_photo_saves_file_and_updates_figure(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.post(
        "/uploads/figure-photo",
        headers=headers,
        files={"file": ("figure.png", png_bytes(300, 300), "image/png")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_photo_type"] == "uploaded"
    assert payload["source_photo_url"].startswith(
        "http://testserver/media/figure-photos/"
    )
    assert payload["source_photo_url"].endswith(".png")
    saved_files = list((tmp_path / "figure-photos").glob("*.png"))
    assert len(saved_files) == 1


def test_upload_figure_photo_rejects_invalid_mime(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.post(
        "/uploads/figure-photo",
        headers=headers,
        files={"file": ("figure.txt", b"not image", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unsupported image type"}


def test_upload_figure_photo_rejects_small_image(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.post(
        "/uploads/figure-photo",
        headers=headers,
        files={"file": ("small.png", png_bytes(128, 128), "image/png")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Image must be at least 256x256"}


def test_generate_figure_requires_auth(client: TestClient) -> None:
    response = client.post("/figures/me/generate")

    assert response.status_code == 401


def test_generate_figure_requires_existing_figure(client: TestClient) -> None:
    response = client.post("/figures/me/generate", headers=auth_headers(client))

    assert response.status_code == 404
    assert response.json() == {"detail": "Figure not found"}


def test_generate_figure_rejects_incomplete_presets(client: TestClient) -> None:
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 400
    assert response.json() == {"detail": "Figure is not ready for generation"}


def test_generate_figure_rejects_uploaded_without_photo(client: TestClient) -> None:
    headers = auth_headers(client)
    client.post("/figures/me", headers=headers)
    client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "uploaded",
        },
    )

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 400
    assert response.json() == {"detail": "Uploaded source photo is missing"}


@pytest.mark.asyncio
async def test_generate_figure_creates_completed_mock_job_and_updates_figure(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(settings, "GENERATION_MODE", "mock")
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "completed"
    assert payload["job"]["prompt"].startswith("Create an image in Funko Pop style")
    assert "VLADIK COLLECTIBLES" in payload["job"]["prompt"]
    assert payload["job"]["result_image_url"].endswith(
        "/media/mock/generated-figure.png"
    )
    assert payload["figure"]["status"] == "completed"
    assert payload["figure"]["image_url"] == payload["job"]["result_image_url"]
    assert payload["figure"]["prompt"] == payload["job"]["prompt"]
    assert (tmp_path / "mock" / "generated-figure.png").exists()
    assert await count_generation_jobs(session_maker) == 1


def test_get_generation_job_requires_owner(client: TestClient) -> None:
    first_headers = auth_headers(client, telegram_id=111)
    make_ready_figure(client, first_headers)
    job_id = client.post("/figures/me/generate", headers=first_headers).json()["job"][
        "id"
    ]

    same_user_response = client.get(
        f"/generation-jobs/{job_id}",
        headers=first_headers,
    )
    second_user_response = client.get(
        f"/generation-jobs/{job_id}",
        headers=auth_headers(client, telegram_id=222),
    )

    assert same_user_response.status_code == 200
    assert same_user_response.json()["id"] == job_id
    assert second_user_response.status_code == 404
