import logging
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_async_session
from app.models.user import User
from app.schemas.figure import FigureResponse
from app.services.figures import FigureService
from app.services.media_storage import CONTENT_TYPE_EXTENSIONS, LocalMediaStorage

router = APIRouter(prefix="/uploads", tags=["uploads"])
logger = logging.getLogger(__name__)

MAX_FIGURE_PHOTO_SIZE_BYTES = 10 * 1024 * 1024
MIN_FIGURE_PHOTO_SIDE_PX = 256


@router.post("/figure-photo", response_model=FigureResponse)
async def upload_figure_photo(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    file: Annotated[UploadFile, File()],
) -> FigureResponse:
    content_type = file.content_type or ""
    if content_type not in CONTENT_TYPE_EXTENSIONS:
        logger.warning(
            "photo upload rejected user_id=%s reason=unsupported_type content_type=%s",
            current_user.id,
            content_type,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось загрузить фото",
        )

    data = await file.read(MAX_FIGURE_PHOTO_SIZE_BYTES + 1)
    if len(data) > MAX_FIGURE_PHOTO_SIZE_BYTES:
        logger.warning(
            "photo upload rejected user_id=%s reason=too_large size_bytes=%s",
            current_user.id,
            len(data),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось загрузить фото",
        )

    validate_image(data)
    photo_url = LocalMediaStorage().save_figure_photo(
        current_user.id,
        content_type,
        data,
    )
    figure = await FigureService().set_uploaded_source_photo(
        session,
        current_user,
        photo_url,
    )
    if figure is None:
        logger.warning("photo upload rejected user_id=%s reason=figure_not_found", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
        )

    logger.info(
        "photo upload stored user_id=%s figure_id=%s size_bytes=%s content_type=%s",
        current_user.id,
        figure.id,
        len(data),
        content_type,
    )
    return FigureResponse.model_validate(figure)


def validate_image(data: bytes) -> None:
    try:
        with Image.open(BytesIO(data)) as image:
            width, height = image.size
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось загрузить фото",
        ) from exc

    if width < MIN_FIGURE_PHOTO_SIDE_PX or height < MIN_FIGURE_PHOTO_SIDE_PX:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Фото слишком маленькое",
        )
