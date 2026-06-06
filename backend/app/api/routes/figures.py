import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_async_session
from app.models.figure import Figure
from app.models.user import User
from app.schemas.figure import (
    FRIENDLY_TELEGRAM_PHOTO_ERROR,
    FigureGenerationResponse,
    FigurePresetsResponse,
    FigurePresetsUpdateRequest,
    FigureResponse,
    PresetOption,
)
from app.services.figures import FigureService, TelegramProfilePhotoUnavailableError
from app.services.generation import (
    FigureGenerationError,
    FigureGenerationService,
    run_generation_job,
    run_generation_job_background,
)
from app.services.share_cards import render_figure_share_card

router = APIRouter(prefix="/figures", tags=["figures"])
logger = logging.getLogger(__name__)

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
    rarities=[
        PresetOption(value="Epic", label="Epic"),
        PresetOption(value="Mythic", label="Mythic"),
        PresetOption(value="Legendary", label="Legendary"),
        PresetOption(value="Founder Legendary", label="Founder Legendary"),
        PresetOption(value="Foil Epic", label="Foil Epic"),
        PresetOption(value="Foil Mythic", label="Foil Mythic"),
        PresetOption(value="Foil Legendary", label="Foil Legendary"),
        PresetOption(
            value="Foil Founder Legendary",
            label="Foil Founder Legendary",
        ),
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


@router.get("/me/card.png")
async def download_my_figure_card(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> Response:
    figure = await FigureService().get_my_figure(session, current_user)
    if figure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )
    if figure.status != "completed" or not figure.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Figure image is not ready",
        )

    return _figure_card_response(figure, current_user)


@router.get("/{figure_id}/card.png")
async def download_public_figure_card(
    figure_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> Response:
    figure = await session.get(Figure, figure_id)
    if figure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )
    if figure.status != "completed" or not figure.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Figure image is not ready",
        )

    user = await session.get(User, figure.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return _figure_card_response(
        figure,
        user,
        extra_headers={"Access-Control-Allow-Origin": "https://web.telegram.org"},
    )


@router.post("/me/generate", response_model=FigureGenerationResponse)
async def generate_my_figure(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> FigureGenerationResponse:
    user_id = current_user.id
    try:
        result = await FigureGenerationService().start_my_figure_generation(
            session,
            current_user,
        )
    except FigureGenerationError as exc:
        await session.rollback()
        logger.warning(
            "generate rejected user_id=%s reason=%s",
            user_id,
            exc,
        )
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
    if job.status == "generating" and getattr(job, "_start_background", False):
        if settings.GENERATION_BACKGROUND_TASKS:
            background_tasks.add_task(run_generation_job_background, job.id)
        else:
            job = await run_generation_job(session, job.id)
            await session.refresh(figure)
    logger.info(
        "generate response user_id=%s figure_id=%s job_id=%s "
        "job_status=%s figure_status=%s",
        user_id,
        figure.id,
        job.id,
        job.status,
        figure.status,
    )
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
    logger.info(
        "figure ensured user_id=%s figure_id=%s display_number=%s status=%s",
        current_user.id,
        figure.id,
        figure.display_number,
        figure.status,
    )
    return FigureResponse.model_validate(figure)


def _figure_card_response(
    figure: Figure,
    user: User,
    extra_headers: dict[str, str] | None = None,
) -> Response:
    image = render_figure_share_card(figure, user)
    file_number = figure.display_number.replace("#", "") or "figure"
    headers = {
        "Content-Disposition": (
            f'attachment; filename="vladblog-collectible-{file_number}.png"'
        )
    }
    if extra_headers:
        headers.update(extra_headers)
    return Response(content=image, media_type="image/png", headers=headers)


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
        logger.warning(
            "preset update rejected missing telegram photo user_id=%s",
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=FRIENDLY_TELEGRAM_PHOTO_ERROR,
        ) from exc
    if figure is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )

    logger.info(
        "presets updated user_id=%s figure_id=%s status=%s "
        "source_photo_type=%s has_source_photo=%s",
        current_user.id,
        figure.id,
        figure.status,
        figure.source_photo_type,
        bool(figure.source_photo_url),
    )
    return FigureResponse.model_validate(figure)
