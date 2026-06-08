import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.users import UsersRepository

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, users_repository: UsersRepository | None = None) -> None:
        self.users_repository = users_repository or UsersRepository()

    async def get_or_create_from_telegram(
        self,
        session: AsyncSession,
        telegram_user_data: dict,
    ) -> User:
        data = self._normalize_telegram_user_data(telegram_user_data)
        user = await self.users_repository.get_by_telegram_id(
            session,
            data["telegram_id"],
        )
        if user:
            updated_user = await self.users_repository.update_from_telegram(
                session,
                user,
                data,
            )
            logger.info(
                "telegram user updated user_id=%s telegram_id=%s has_photo=%s",
                updated_user.id,
                updated_user.telegram_id,
                bool(updated_user.photo_url),
            )
            return updated_user

        try:
            created_user = await self.users_repository.create(session, data)
            logger.info(
                "telegram user created user_id=%s telegram_id=%s has_photo=%s",
                created_user.id,
                created_user.telegram_id,
                bool(created_user.photo_url),
            )
            return created_user
        except IntegrityError:
            await session.rollback()
            logger.warning(
                "telegram user create raced telegram_id=%s",
                data["telegram_id"],
            )
            user = await self.users_repository.get_by_telegram_id(
                session,
                data["telegram_id"],
            )
            if user:
                updated_user = await self.users_repository.update_from_telegram(
                    session,
                    user,
                    data,
                )
                logger.info(
                    "telegram user updated after race user_id=%s telegram_id=%s",
                    updated_user.id,
                    updated_user.telegram_id,
                )
                return updated_user
            raise

    def _normalize_telegram_user_data(self, telegram_user_data: dict) -> dict:
        return {
            "telegram_id": int(telegram_user_data["id"]),
            "username": telegram_user_data.get("username"),
            "first_name": telegram_user_data.get("first_name"),
            "last_name": telegram_user_data.get("last_name"),
            "photo_url": telegram_user_data.get("photo_url"),
            "language_code": telegram_user_data.get("language_code"),
            "is_premium": telegram_user_data.get("is_premium", False),
        }
