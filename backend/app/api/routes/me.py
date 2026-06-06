import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_async_session
from app.enums.presets import SourcePhotoType
from app.models.figure import Figure
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.figures import FigureService
from app.services.media_storage import LocalMediaStorage
from app.services.telegram_photos import (
    download_telegram_profile_photo,
    inspect_telegram_profile_photo,
)

router = APIRouter(tags=["me"])
LOCAL_PREVIEW_TELEGRAM_ID = 100000001
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.post("/me/sync-telegram-photo", response_model=UserResponse)
async def sync_my_telegram_photo(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    logger.info(
        "telegram photo sync started user_id=%s telegram_id=%s has_existing_photo=%s",
        current_user.id,
        current_user.telegram_id,
        bool(current_user.photo_url),
    )
    try:
        photo_bytes = await asyncio.wait_for(
            asyncio.to_thread(
                download_telegram_profile_photo,
                current_user.telegram_id,
            ),
            timeout=8,
        )
    except TimeoutError:
        logger.warning(
            "telegram photo sync timeout user_id=%s telegram_id=%s",
            current_user.id,
            current_user.telegram_id,
        )
        photo_bytes = None
    if not photo_bytes:
        logger.info(
            "telegram photo sync unavailable user_id=%s telegram_id=%s",
            current_user.id,
            current_user.telegram_id,
        )
        return current_user

    photo_url = LocalMediaStorage().save_telegram_profile_photo(
        current_user.id,
        photo_bytes,
    )
    current_user.photo_url = photo_url

    figure = await FigureService().get_my_figure(session, current_user)
    if _uses_telegram_profile_photo(figure):
        figure.source_photo_url = photo_url
        session.add(figure)

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    logger.info(
        "telegram photo sync stored user_id=%s telegram_id=%s photo_url_present=%s",
        current_user.id,
        current_user.telegram_id,
        bool(current_user.photo_url),
    )
    return current_user


@router.get("/me/telegram-photo-debug")
async def debug_my_telegram_photo(
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if current_user.telegram_id == LOCAL_PREVIEW_TELEGRAM_ID:
        logger.info("telegram photo debug local preview user_id=%s", current_user.id)
        return {
            "telegram_id": current_user.telegram_id,
            "stored_user_photo_url": bool(current_user.photo_url),
            "status": "local_preview_user",
            "get_user_profile_photos": None,
            "get_file": None,
            "message": "Local preview auth uses a fake Telegram user; profile photos are available only from a real Telegram Mini App session.",
        }

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(
                inspect_telegram_profile_photo,
                current_user.telegram_id,
                bool(current_user.photo_url),
            ),
            timeout=8,
        )
    except TimeoutError:
        logger.warning(
            "telegram photo debug timeout user_id=%s telegram_id=%s",
            current_user.id,
            current_user.telegram_id,
        )
        return {
            "telegram_id": current_user.telegram_id,
            "stored_user_photo_url": bool(current_user.photo_url),
            "status": "timeout",
            "message": "Telegram Bot API did not respond in time",
        }

def _uses_telegram_profile_photo(figure: Figure | None) -> bool:
    return (
        figure is not None
        and figure.source_photo_type == SourcePhotoType.TELEGRAM_PROFILE.value
    )
