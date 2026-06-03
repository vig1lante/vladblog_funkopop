from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.enums.figure import FigureStatus, GenerationJobStatus
from app.enums.presets import SourcePhotoType
from app.models.figure import Figure
from app.models.generation_job import GenerationJob
from app.models.user import User, utc_now
from app.repositories.figures import FiguresRepository
from app.services.figures import has_generation_presets
from app.services.media_storage import LocalMediaStorage
from app.services.prompts import build_figure_prompt


class FigureGenerationError(ValueError):
    pass


class FigureGenerationService:
    def __init__(self, figures_repository: FiguresRepository | None = None) -> None:
        self.figures_repository = figures_repository or FiguresRepository()

    async def generate_my_figure(
        self,
        session: AsyncSession,
        user: User,
    ) -> tuple[GenerationJob, Figure] | None:
        figure = await self.figures_repository.get_by_user_id(session, user.id)
        if figure is None:
            return None

        self._validate_figure(figure)

        now = utc_now()
        job = GenerationJob(
            figure_id=figure.id,
            user_id=user.id,
            status=GenerationJobStatus.PENDING.value,
            model=settings.GENERATION_MODE,
            attempt=figure.generation_attempts + 1,
        )
        session.add(job)
        await session.flush()

        job.status = GenerationJobStatus.PREPARING_PROMPT.value
        job.started_at = now
        prompt = build_figure_prompt(figure)
        job.prompt = prompt
        figure.prompt = prompt

        job.status = GenerationJobStatus.GENERATING.value
        figure.status = FigureStatus.GENERATING.value

        if settings.GENERATION_MODE != "mock":
            raise FigureGenerationError("Only mock generation mode is available")

        result_url = LocalMediaStorage().ensure_mock_generated_figure(
            figure.display_number,
            figure.rarity,
        )
        job.status = GenerationJobStatus.COMPLETED.value
        job.result_image_url = result_url
        job.completed_at = utc_now()
        figure.status = FigureStatus.COMPLETED.value
        figure.image_url = result_url
        figure.generation_attempts += 1
        figure.last_generation_error = None

        session.add_all([job, figure])
        await session.commit()
        await session.refresh(job)
        await session.refresh(figure)
        return job, figure

    async def get_job_for_user(
        self,
        session: AsyncSession,
        user: User,
        job_id: UUID,
    ) -> GenerationJob | None:
        job = await session.get(GenerationJob, job_id)
        if job is None or job.user_id != user.id:
            return None
        return job

    def _validate_figure(self, figure: Figure) -> None:
        if figure.status not in {
            FigureStatus.READY_FOR_GENERATION.value,
            FigureStatus.FAILED.value,
        }:
            raise FigureGenerationError("Figure is not ready for generation")

        if not has_generation_presets(figure):
            raise FigureGenerationError("Figure presets are not complete")

        if (
            figure.source_photo_type == SourcePhotoType.UPLOADED.value
            and not figure.source_photo_url
        ):
            raise FigureGenerationError("Uploaded source photo is missing")
