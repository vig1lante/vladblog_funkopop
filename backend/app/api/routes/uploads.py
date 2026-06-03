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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type",
        )

    data = await file.read(MAX_FIGURE_PHOTO_SIZE_BYTES + 1)
    if len(data) > MAX_FIGURE_PHOTO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be 10 MB or smaller",
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Figure not found",
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
            detail="Invalid image file",
        ) from exc

    if width < MIN_FIGURE_PHOTO_SIDE_PX or height < MIN_FIGURE_PHOTO_SIDE_PX:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be at least 256x256",
        )
