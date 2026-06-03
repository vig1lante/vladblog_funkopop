from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_async_session
from app.models.user import User
from app.schemas.figure import GenerationJobResponse
from app.services.generation import FigureGenerationService

router = APIRouter(prefix="/generation-jobs", tags=["generation-jobs"])


@router.get("/{job_id}", response_model=GenerationJobResponse)
async def get_generation_job(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> GenerationJobResponse:
    job = await FigureGenerationService().get_job_for_user(
        session,
        current_user,
        job_id,
    )
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found",
        )
    return GenerationJobResponse.model_validate(job)
