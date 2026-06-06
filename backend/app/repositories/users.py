from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, utc_now


class UsersRepository:
    async def get_by_id(self, session: AsyncSession, user_id: UUID) -> User | None:
        return await session.get(User, user_id)

    async def get_by_telegram_id(
        self,
        session: AsyncSession,
        telegram_id: int,
    ) -> User | None:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def create(self, session: AsyncSession, data: dict) -> User:
        user = User(
            telegram_id=data["telegram_id"],
            username=data.get("username"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            photo_url=data.get("photo_url"),
            language_code=data.get("language_code"),
            is_premium=data.get("is_premium", False),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    async def update_from_telegram(
        self,
        session: AsyncSession,
        user: User,
        data: dict,
    ) -> User:
        user.username = data.get("username")
        user.first_name = data.get("first_name")
        user.last_name = data.get("last_name")
        if data.get("photo_url"):
            user.photo_url = data["photo_url"]
        user.language_code = data.get("language_code")
        user.is_premium = data.get("is_premium", False)
        user.updated_at = utc_now()
        await session.commit()
        await session.refresh(user)
        return user
