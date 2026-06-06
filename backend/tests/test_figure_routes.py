import struct
import zlib
from collections.abc import AsyncGenerator
from io import BytesIO
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
from app.models.user import utc_now
from app.services import generation as generation_service
from tests.helpers import build_telegram_init_data


@pytest.fixture(autouse=True)
def _run_generation_inline(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "GENERATION_BACKGROUND_TASKS", False)


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


async def make_active_generation_job(
    session_maker: async_sessionmaker[AsyncSession],
    figure_id: str,
    user_id: str,
) -> str:
    async with session_maker() as session:
        figure = await session.get(Figure, UUID(figure_id))
        assert figure is not None
        figure.status = "generating"
        job = GenerationJob(
            figure_id=UUID(figure_id),
            user_id=UUID(user_id),
            status="generating",
            model="mock",
            attempt=1,
            max_attempts=2,
            started_at=utc_now(),
        )
        session.add_all([figure, job])
        await session.commit()
        return str(job.id)


def make_ready_figure(client: TestClient, headers: dict[str, str]) -> None:
    client.post("/figures/me", headers=headers)
    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
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
async def test_post_figures_me_creates_legendary_figure_for_current_user(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    headers = auth_headers(client)

    response = client.post("/figures/me", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["mint_number"] == 1
    assert payload["display_number"] == "#0001"
    assert payload["rarity"] == "Legendary"
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
    assert response.json()["next_step"] == "photo"


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
    assert [option["value"] for option in payload["rarities"]] == [
        "Epic",
        "Mythic",
        "Legendary",
        "Founder Legendary",
    ]
    assert payload["source_photo_types"][0]["value"] == "telegram_profile"
    assert [option["value"] for option in payload["source_photo_types"]] == [
        "telegram_profile",
        "uploaded",
        "none",
    ]


def test_get_figure_presets_returns_large_style_catalog(client: TestClient) -> None:
    response = client.get("/figures/presets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["vibes"]) >= 100
    assert len(payload["accessories"]) >= 90
    assert len(payload["backgrounds"]) >= 90
    for category in ["vibes", "accessories", "backgrounds"]:
        values = [option["value"] for option in payload[category]]
        labels = [option["label"] for option in payload[category]]
        assert len(values) == len(set(values))
        assert len(labels) == len(set(labels))

    vibe_values = {option["value"] for option in payload["vibes"]}
    assert {
        "software_engineer",
        "ai_researcher",
        "photographer",
        "chef",
        "teacher",
        "runner",
        "chess_player",
        "gardener",
        "k_pop",
        "language_learner",
    }.issubset(vibe_values)

    accessory_values = {option["value"] for option in payload["accessories"]}
    assert {
        "camera",
        "guitar",
        "chess_piece",
        "yoga_mat",
        "passport",
        "plant_pot",
        "vr_headset",
        "dumbbell",
    }.issubset(accessory_values)

    background_values = {option["value"] for option in payload["backgrounds"]}
    assert {
        "music_studio",
        "library",
        "science_lab",
        "skate_park",
        "coffee_shop",
        "startup_office",
        "greenhouse",
        "train_station",
    }.issubset(background_values)


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
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "rarity": "Mythic",
            "source_photo_type": "telegram_profile",
            "is_public": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_color"] is None
    assert payload["selected_vibe"] == "cyberpunk"
    assert payload["selected_accessory"] == "laptop"
    assert payload["selected_background"] == "neon_server_room"
    assert payload["rarity"] == "Mythic"
    assert payload["source_photo_type"] == "telegram_profile"
    assert payload["source_photo_url"] == telegram_photo_url
    assert payload["is_public"] is False
    assert payload["status"] == "ready_for_generation"
    assert payload["next_step"] == "ready_to_generate"


def test_patch_presets_accepts_expanded_style_catalog(client: TestClient) -> None:
    headers = auth_headers(client, photo_url="https://cdn.telegram.example/avatar.jpg")
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_vibe": "software_engineer",
            "selected_accessory": "camera",
            "selected_background": "startup_office",
            "rarity": "Mythic",
            "source_photo_type": "telegram_profile",
            "is_public": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_vibe"] == "software_engineer"
    assert payload["selected_accessory"] == "camera"
    assert payload["selected_background"] == "startup_office"
    assert payload["status"] == "ready_for_generation"


def test_photo_choice_routes_to_presets_before_generation(client: TestClient) -> None:
    headers = auth_headers(client, photo_url="https://cdn.telegram.example/avatar.jpg")
    client.post("/figures/me", headers=headers)

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={"source_photo_type": "telegram_profile"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_photo_type"] == "telegram_profile"
    assert payload["next_step"] == "presets"


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
    assert response.json() == {
        "detail": (
            "Не удалось получить фото из Telegram. Загрузи своё фото или "
            "создай фигурку без фото."
        )
    }


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
    assert response.json() == {"detail": "Не удалось загрузить фото"}


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
    assert response.json() == {"detail": "Фото слишком маленькое"}


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
async def test_generate_figure_returns_existing_active_job(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    headers = auth_headers(client)
    make_ready_figure(client, headers)
    figure = client.get("/figures/me", headers=headers).json()
    job_id = await make_active_generation_job(
        session_maker,
        figure["id"],
        figure["user_id"],
    )

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["id"] == job_id
    assert payload["job"]["status"] == "generating"
    assert payload["figure"]["status"] == "generating"
    assert await count_generation_jobs(session_maker) == 1


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
    assert payload["job"]["model"] == "mock"
    assert payload["job"]["prompt"].startswith("Create an image in Funko Pop style")
    assert "VLADBLOG COLLECTIBLES" in payload["job"]["prompt"]
    assert payload["job"]["result_image_url"].endswith(
        "/media/mock/generated-figure.png"
    )
    assert payload["figure"]["status"] == "completed"
    assert payload["figure"]["next_step"] == "completed"
    assert payload["figure"]["image_url"] == payload["job"]["result_image_url"]
    assert payload["figure"]["foil_rarity"] == "Foil Legendary"
    assert payload["figure"]["foil_image_url"].endswith(
        "/media/mock/generated-figure-foil.png"
    )
    assert payload["figure"]["prompt"] == payload["job"]["prompt"]
    assert payload["figure"]["foil_prompt"]
    assert payload["foil_figure"]["rarity"] == "Foil Legendary"
    assert payload["foil_figure"]["image_url"] == payload["figure"]["foil_image_url"]
    assert "holographic reflections" in payload["foil_figure"]["prompt"]
    assert (tmp_path / "mock" / "generated-figure.png").exists()
    assert (tmp_path / "mock" / "generated-figure-foil.png").exists()
    assert await count_generation_jobs(session_maker) == 1

    refreshed = client.get("/figures/me", headers=headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["image_url"] == payload["job"]["result_image_url"]
    assert refreshed.json()["foil_image_url"] == payload["figure"]["foil_image_url"]


def test_generate_figure_mock_mode_is_case_insensitive_and_never_uses_openai(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(settings, "GENERATION_MODE", " Mock ")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(
        generation_service,
        "get_openai_client",
        lambda: pytest.fail("OpenAI client must not be created in mock mode"),
    )
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "completed"
    assert payload["job"]["model"] == "mock"


@pytest.mark.asyncio
async def test_generate_figure_rejects_when_generation_disabled(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(settings, "GENERATION_MODE", "mock")
    monkeypatch.setattr(settings, "GENERATION_ENABLED", False, raising=False)
    monkeypatch.setattr(
        generation_service,
        "run_mock_generation",
        lambda *args: pytest.fail("generation must not run when disabled"),
    )
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 400
    assert response.json() == {"detail": "Figure generation is disabled"}
    assert await count_generation_jobs(session_maker) == 0
    assert not (tmp_path / "mock" / "generated-figure.png").exists()


def test_download_my_figure_card_returns_final_png(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(settings, "GENERATION_MODE", "mock")
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    generated = client.post("/figures/me/generate", headers=headers)
    assert generated.status_code == 200
    generated_payload = generated.json()

    response = client.get("/figures/me/card.png", headers=headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["content-disposition"] == (
        'attachment; filename="vladblog-collectible-0001.png"'
    )
    assert response.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(response.content) > 1000

    public_response = client.get(
        f"/figures/{generated_payload['figure']['id']}/card.png"
    )
    assert public_response.status_code == 200
    assert public_response.headers["content-type"] == "image/png"
    assert public_response.headers["access-control-allow-origin"] == (
        "https://web.telegram.org"
    )
    assert public_response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_download_my_figure_card_requires_completed_image(
    client: TestClient,
) -> None:
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.get("/figures/me/card.png", headers=headers)

    assert response.status_code == 400
    assert response.json() == {"detail": "Figure image is not ready"}


def test_generate_figure_openai_requires_api_key(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "GENERATION_MODE", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 400
    assert response.json()["detail"] == "OPENAI_API_KEY is required for openai mode"


def test_updating_generation_presets_clears_previous_image(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(settings, "GENERATION_MODE", "mock")
    headers = auth_headers(client)
    make_ready_figure(client, headers)
    generated = client.post("/figures/me/generate", headers=headers).json()["figure"]
    assert generated["image_url"]

    response = client.patch(
        "/figures/me/presets",
        headers=headers,
        json={"selected_vibe": "magic"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready_for_generation"
    assert payload["selected_vibe"] == "magic"
    assert payload["image_url"] is None
    assert payload["prompt"] is None


@pytest.mark.asyncio
async def test_generate_figure_openai_saves_result_and_prompt(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeImage:
        b64_json = "iVBORw0KGgo="

    class FakeResponse:
        data = [FakeImage()]

    class FakeImages:
        def generate(self, **kwargs: object) -> FakeResponse:
            assert kwargs["model"] == "gpt-image-2"
            assert kwargs["size"] == "1024x1024"
            assert kwargs["quality"] == "medium"
            assert "Funko Pop style" in str(kwargs["prompt"])
            return FakeResponse()

    class FakeClient:
        images = FakeImages()

    monkeypatch.setattr(settings, "GENERATION_MODE", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-2")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_SIZE", "1024x1024")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_QUALITY", "medium")
    monkeypatch.setattr(settings, "OPENAI_IMAGE_MAX_ATTEMPTS", 2)
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(generation_service, "get_openai_client", lambda: FakeClient())
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "completed"
    assert payload["job"]["model"] == "gpt-image-2"
    assert payload["job"]["prompt"].startswith("Create an image in Funko Pop style")
    assert "metallic gold" in payload["job"]["prompt"]
    assert "Character name from Telegram: Vlad" in payload["job"]["prompt"]
    assert "octagon" not in payload["job"]["prompt"].lower()
    assert "standalone digit" not in payload["job"]["prompt"].lower()
    assert payload["job"]["max_attempts"] == 2
    assert payload["job"]["result_image_url"].startswith(
        "http://testserver/media/generated-figures/"
    )
    assert payload["figure"]["status"] == "completed"
    assert payload["figure"]["image_url"] == payload["job"]["result_image_url"]
    assert payload["figure"]["prompt"] == payload["job"]["prompt"]
    assert list((tmp_path / "generated-figures").glob("*.png"))
    assert await count_generation_jobs(session_maker) == 1


@pytest.mark.asyncio
async def test_generate_figure_openai_offloads_blocking_image_call(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = []
    active_calls = 0
    max_active_calls = 0

    class FakeClient:
        pass

    async def fake_to_thread(func: object, *args: object) -> bytes:
        nonlocal active_calls, max_active_calls
        active_calls += 1
        max_active_calls = max(max_active_calls, active_calls)
        calls.append((func, args))
        await generation_service.asyncio.sleep(0.01)
        active_calls -= 1
        return b"\x89PNG\r\n\x1a\n"

    monkeypatch.setattr(settings, "GENERATION_MODE", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(generation_service, "get_openai_client", lambda: FakeClient())
    monkeypatch.setattr(generation_service.asyncio, "to_thread", fake_to_thread)
    headers = auth_headers(client)
    make_ready_figure(client, headers)

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    assert response.json()["job"]["status"] == "completed"
    assert len(calls) == 2
    assert max_active_calls == 2
    assert all(call[0] is generation_service._generate_openai_image for call in calls)
    prompts = [str(call[1][2]) for call in calls]
    assert any("metallic gold" in prompt for prompt in prompts)
    assert any("holographic reflections" in prompt for prompt in prompts)


def test_generate_figure_openai_uses_uploaded_photo_reference(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeImage:
        b64_json = "iVBORw0KGgo="

    class FakeResponse:
        data = [FakeImage()]

    class FakeImages:
        def edit(self, **kwargs: object) -> FakeResponse:
            image_file = kwargs["image"]
            assert image_file.read(8) == b"\x89PNG\r\n\x1a\n"
            assert "provided user photo" in str(kwargs["prompt"])
            return FakeResponse()

        def generate(self, **kwargs: object) -> FakeResponse:
            raise AssertionError("uploaded photo must use images.edit")

    class FakeClient:
        images = FakeImages()

    monkeypatch.setattr(settings, "GENERATION_MODE", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(generation_service, "get_openai_client", lambda: FakeClient())
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
            "source_photo_type": "none",
        },
    )
    client.post(
        "/uploads/figure-photo",
        headers=headers,
        files={"file": ("figure.png", png_bytes(300, 300), "image/png")},
    )

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    assert response.json()["job"]["status"] == "completed"


def test_generate_figure_openai_normalizes_telegram_svg_reference(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeImage:
        b64_json = "iVBORw0KGgo="

    class FakeResponse:
        data = [FakeImage()]

    class FakeImages:
        def edit(self, **kwargs: object) -> FakeResponse:
            image_file = kwargs["image"]
            assert image_file.read(8) == b"\x89PNG\r\n\x1a\n"
            return FakeResponse()

    class FakeClient:
        images = FakeImages()

    monkeypatch.setattr(settings, "GENERATION_MODE", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    monkeypatch.setattr(generation_service, "get_openai_client", lambda: FakeClient())
    monkeypatch.setattr(
        generation_service,
        "download_telegram_profile_photo",
        lambda telegram_id: png_bytes(300, 300),
    )
    headers = auth_headers(
        client,
        photo_url="https://t.me/i/userpic/320/example.svg",
    )
    client.post("/figures/me", headers=headers)
    client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
        },
    )

    response = client.post("/figures/me/generate", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "completed"
    assert payload["figure"]["source_photo_url"].startswith(
        "http://testserver/media/telegram-photos/"
    )


def test_openai_reference_image_download_uses_supported_file_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeResponse:
        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return b"\x89PNG\r\n\x1a\n"

    monkeypatch.setattr(
        generation_service,
        "urlopen",
        lambda *args, **kwargs: FakeResponse(),
    )

    with generation_service._open_reference_image(
        "https://example.com/avatar.png",
    ) as image_file:
        assert isinstance(image_file, BytesIO)
        assert image_file.name == "reference.png"
        assert image_file.read(8) == b"\x89PNG\r\n\x1a\n"


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


def test_sync_telegram_photo_requires_auth(client: TestClient) -> None:
    response = client.post("/me/sync-telegram-photo")

    assert response.status_code == 401


def test_sync_telegram_photo_updates_user_and_selected_figure(
    client: TestClient,
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LOCAL_STORAGE_PATH", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_MEDIA_BASE_URL", "http://testserver/media")
    headers = auth_headers(client, photo_url="https://old.example/avatar.jpg")
    client.post("/figures/me", headers=headers)
    client.patch(
        "/figures/me/presets",
        headers=headers,
        json={
            "selected_color": "purple",
            "selected_vibe": "cyberpunk",
            "selected_accessory": "laptop",
            "selected_background": "neon_server_room",
            "source_photo_type": "telegram_profile",
        },
    )

    monkeypatch.setattr(
        "app.api.routes.me.download_telegram_profile_photo",
        lambda telegram_id: png_bytes(300, 300),
    )

    response = client.post("/me/sync-telegram-photo", headers=headers)

    assert response.status_code == 200
    user = response.json()
    assert user["photo_url"].startswith("http://testserver/media/telegram-photos/")
    figure = client.get("/figures/me", headers=headers).json()
    assert figure["source_photo_url"] == user["photo_url"]
    assert list((tmp_path / "telegram-photos").glob("*.jpg"))
