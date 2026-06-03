from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.services.users import UserService


class RollbackSession:
    def __init__(self) -> None:
        self.was_rolled_back = False

    async def rollback(self) -> None:
        self.was_rolled_back = True


class RacingUsersRepository:
    def __init__(self) -> None:
        self.get_calls = 0
        self.user = User(
            telegram_id=123456,
            username="old",
            first_name="Old",
            is_premium=False,
        )

    async def get_by_telegram_id(
        self,
        session: RollbackSession,
        telegram_id: int,
    ) -> User | None:
        self.get_calls += 1
        if self.get_calls == 1:
            return None
        return self.user

    async def create(self, session: RollbackSession, data: dict) -> User:
        raise IntegrityError("insert users", {}, Exception("duplicate telegram_id"))

    async def update_from_telegram(
        self,
        session: RollbackSession,
        user: User,
        data: dict,
    ) -> User:
        user.username = data["username"]
        user.first_name = data["first_name"]
        return user


async def test_get_or_create_from_telegram_recovers_from_duplicate_insert() -> None:
    session = RollbackSession()
    repository = RacingUsersRepository()
    service = UserService(users_repository=repository)

    user = await service.get_or_create_from_telegram(
        session,
        {
            "id": 123456,
            "username": "new",
            "first_name": "New",
            "is_premium": True,
        },
    )

    assert session.was_rolled_back is True
    assert user.telegram_id == 123456
    assert user.username == "new"
    assert user.first_name == "New"
