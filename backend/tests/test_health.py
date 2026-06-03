import pytest
from fastapi.testclient import TestClient

from app.core.database import get_async_session
from app.main import app


class WorkingSession:
    async def execute(self, statement: object) -> int:
        assert str(statement) == "SELECT 1"
        return 1


class FailingSession:
    async def execute(self, statement: object) -> None:
        raise ConnectionError("database unavailable")


async def working_session_override():
    yield WorkingSession()


async def failing_session_override():
    yield FailingSession()


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_health_returns_ok() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_returns_ok_when_database_responds() -> None:
    app.dependency_overrides[get_async_session] = working_session_override
    client = TestClient(app)

    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_db_returns_clear_error_when_database_fails() -> None:
    app.dependency_overrides[get_async_session] = failing_session_override
    client = TestClient(app)

    response = client.get("/health/db")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Database health check failed",
    }
