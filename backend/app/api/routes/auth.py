from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.security import create_access_token
from app.core.telegram_auth import TelegramAuthError, validate_telegram_init_data
from app.schemas.auth import AuthResponse, TelegramAuthRequest
from app.services.figures import FigureService
from app.services.users import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(
    payload: TelegramAuthRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AuthResponse:
    try:
        telegram_user_data = validate_telegram_init_data(
            payload.init_data,
            settings.TELEGRAM_BOT_TOKEN,
        )
    except TelegramAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user = await UserService().get_or_create_from_telegram(
        session,
        telegram_user_data,
    )
    figure = await FigureService().get_my_figure(session, user)
    return AuthResponse(
        access_token=create_access_token(subject=str(user.id)),
        user=user,
        figure=figure,
    )


@router.post("/dev", response_model=AuthResponse)
async def auth_dev(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AuthResponse:
    if settings.APP_ENV != "local":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    user = await UserService().get_or_create_from_telegram(
        session,
        {
            "id": 100000001,
            "username": "local_preview",
            "first_name": "Local",
            "last_name": "Preview",
            "language_code": "ru",
            "is_premium": False,
        },
    )
    figure = await FigureService().get_my_figure(session, user)
    return AuthResponse(
        access_token=create_access_token(subject=str(user.id)),
        user=user,
        figure=figure,
    )
