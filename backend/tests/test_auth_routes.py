from collections.abc import AsyncGenerator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_async_session
from app.main import app
from app.models.user import User
from tests.helpers import build_telegram_init_data

TEST_BOT_TOKEN = "123456:test-token"
TEST_JWT_SECRET = "x" * 32


@pytest.fixture(autouse=True)
def _configure_test_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "DEV_AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", TEST_JWT_SECRET)
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", TEST_BOT_TOKEN)


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


def build_init_data(
    first_name: str = "Vlad",
    username: str = "vlad",
    photo_url: str | None = None,
) -> str:
    user = {
        "id": 123456,
        "username": username,
        "first_name": first_name,
        "last_name": None,
        "language_code": "ru",
        "is_premium": False,
    }
    if photo_url is not None:
        user["photo_url"] = photo_url

    return build_telegram_init_data(
        bot_token=settings.TELEGRAM_BOT_TOKEN,
        user=user,
    )


async def count_users(session_maker: async_sessionmaker[AsyncSession]) -> int:
    async with session_maker() as session:
        result = await session.execute(select(User))
        return len(result.scalars().all())


async def ban_first_user(session_maker: async_sessionmaker[AsyncSession]) -> None:
    async with session_maker() as session:
        result = await session.execute(select(User))
        user = result.scalar_one()
        user.is_banned = True
        await session.commit()


def test_auth_telegram_creates_user_and_returns_token(client: TestClient) -> None:
    response = client.post("/auth/telegram", json={"init_data": build_init_data()})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["telegram_id"] == 123456
    assert payload["user"]["first_name"] == "Vlad"
    assert payload["figure"] is None


def test_auth_telegram_rejects_placeholder_bot_token(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "your_bot_token")
    response = client.post(
        "/auth/telegram",
        json={
            "init_data": build_telegram_init_data(
                bot_token="your_bot_token",
                user={
                    "id": 123456,
                    "username": "vlad",
                    "first_name": "Vlad",
                },
            )
        },
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Telegram auth is not configured"}


def test_auth_dev_returns_local_preview_user(client: TestClient) -> None:
    response = client.post("/auth/dev")

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["user"]["telegram_id"] == 100000001
    assert payload["figure"] is None


def test_auth_dev_requires_explicit_dev_auth_flag(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "DEV_AUTH_ENABLED", False, raising=False)

    response = client.post("/auth/dev")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_auth_telegram_updates_existing_user_without_duplicate(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    first = client.post("/auth/telegram", json={"init_data": build_init_data()})
    second = client.post(
        "/auth/telegram",
        json={
            "init_data": build_init_data(
                first_name="Vladislav",
                username="vladblog",
            )
        },
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["user"]["first_name"] == "Vladislav"
    assert second.json()["user"]["username"] == "vladblog"
    assert await count_users(session_maker) == 1


def test_auth_telegram_does_not_clear_existing_photo_when_missing(
    client: TestClient,
) -> None:
    first = client.post(
        "/auth/telegram",
        json={
            "init_data": build_init_data(
                photo_url="https://telegram.example/avatar.jpg",
            )
        },
    )
    second = client.post("/auth/telegram", json={"init_data": build_init_data()})

    assert first.status_code == 200
    assert first.json()["user"]["photo_url"] == "https://telegram.example/avatar.jpg"
    assert second.status_code == 200
    assert second.json()["user"]["photo_url"] == "https://telegram.example/avatar.jpg"


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/me")

    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get("/me", headers={"Authorization": "Bearer bad-token"})

    assert response.status_code == 401


def test_me_with_valid_token_returns_current_user(client: TestClient) -> None:
    auth_response = client.post("/auth/telegram", json={"init_data": build_init_data()})
    token = auth_response.json()["access_token"]

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["telegram_id"] == 123456


@pytest.mark.asyncio
async def test_me_with_banned_user_returns_403(
    client: TestClient,
    session_maker: async_sessionmaker[AsyncSession],
) -> None:
    auth_response = client.post("/auth/telegram", json={"init_data": build_init_data()})
    token = auth_response.json()["access_token"]
    await ban_first_user(session_maker)

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
