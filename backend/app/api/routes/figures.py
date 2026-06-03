from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_async_session
from app.models.user import User
from app.schemas.figure import (
    FigureGenerationResponse,
    FigurePresetsResponse,
    FigurePresetsUpdateRequest,
    FigureResponse,
    PresetOption,
)
from app.services.figures import FigureService, TelegramProfilePhotoUnavailableError
from app.services.generation import FigureGenerationError, FigureGenerationService

router = APIRouter(prefix="/figures", tags=["figures"])

PRESET_OPTIONS = FigurePresetsResponse(
    colors=[
        PresetOption(value="red", label="Красный"),
        PresetOption(value="blue", label="Синий"),
        PresetOption(value="green", label="Зелёный"),
        PresetOption(value="purple", label="Фиолетовый"),
        PresetOption(value="black", label="Чёрный"),
        PresetOption(value="gold", label="Золотой"),
    ],
    vibes=[
        PresetOption(value="crypto", label="Крипто"),
        PresetOption(value="cyberpunk", label="Киберпанк"),
        PresetOption(value="meme", label="Мемный"),
        PresetOption(value="gamer", label="Геймер"),
        PresetOption(value="magic", label="Магия"),
        PresetOption(value="samurai", label="Самурай"),
    ],
    accessories=[
        PresetOption(value="laptop", label="Ноутбук"),
        PresetOption(value="coffee", label="Кофе"),
        PresetOption(value="gamepad", label="Геймпад"),
        PresetOption(value="bitcoin_coin", label="Bitcoin-монета"),
        PresetOption(value="microphone", label="Микрофон"),
        PresetOption(value="drumsticks", label="Барабанные палочки"),
    ],
    backgrounds=[
        PresetOption(value="neon_server_room", label="Неоновая серверная"),
        PresetOption(value="crypto_chart", label="Крипто-график"),
        PresetOption(value="space", label="Космос"),
        PresetOption(value="gaming_room", label="Игровая комната"),
        PresetOption(value="castle", label="Замок"),
        PresetOption(value="white_studio", label="Белая студия"),
    ],
    source_photo_types=[
        PresetOption(value="telegram_profile", label="Фото Telegram"),
        PresetOption(value="uploaded", label="Загруженное фото"),
        PresetOption(value="none", label="Без фото"),
    ],
)


@router.get("/presets", response_model=FigurePresetsResponse)
async def get_figure_presets() -> FigurePresetsResponse:
    return PRESET_OPTIONS


@router.get("/me", response_model=FigureResponse)
async def get_my_figure(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> FigureResponse:
    figure = await FigureService().get_my_figure(session, current_user)
    if figure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )

    return FigureResponse.model_validate(figure)


@router.post("/me/generate", response_model=FigureGenerationResponse)
async def generate_my_figure(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> FigureGenerationResponse:
    try:
        result = await FigureGenerationService().generate_my_figure(
            session,
            current_user,
        )
    except FigureGenerationError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )

    job, figure = result
    return FigureGenerationResponse(
        job=job,
        figure=figure,
    )


@router.post("/me", response_model=FigureResponse)
async def create_my_figure(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> FigureResponse:
    figure = await FigureService().create_my_figure(session, current_user)
    return FigureResponse.model_validate(figure)


@router.patch("/me/presets", response_model=FigureResponse)
async def update_my_figure_presets(
    presets: FigurePresetsUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> FigureResponse:
    try:
        figure = await FigureService().update_my_presets(
            session,
            current_user,
            presets,
        )
    except TelegramProfilePhotoUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram profile photo is not available",
        ) from exc
    if figure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )

    return FigureResponse.model_validate(figure)
