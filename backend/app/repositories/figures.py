from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.figure import FigureStatus
from app.models.figure import Figure
from app.models.generation_job import GenerationJob
from app.schemas.figure import FigurePresetsUpdateRequest

ACTIVE_GENERATION_JOB_STATUSES = {
    "pending",
    "preparing_prompt",
    "generating",
}


class FiguresRepository:
    async def get_by_user_id(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> Figure | None:
        result = await session.execute(select(Figure).where(Figure.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_by_id(
        self,
        session: AsyncSession,
        figure_id: UUID,
    ) -> Figure | None:
        return await session.get(Figure, figure_id)

    async def get_active_job_by_figure_id(
        self,
        session: AsyncSession,
        figure_id: UUID,
    ) -> GenerationJob | None:
        result = await session.execute(
            select(GenerationJob)
            .where(
                GenerationJob.figure_id == figure_id,
                GenerationJob.status.in_(ACTIVE_GENERATION_JOB_STATUSES),
            )
            .order_by(GenerationJob.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_next_mint_number(self, session: AsyncSession) -> int:
        if session.bind and session.bind.dialect.name == "sqlite":
            result = await session.execute(select(func.max(Figure.mint_number)))
            return (result.scalar_one_or_none() or 0) + 1

        result = await session.execute(text("SELECT nextval('figure_mint_number_seq')"))
        return int(result.scalar_one())

    async def create(
        self,
        session: AsyncSession,
        user_id: UUID,
        mint_number: int,
        display_number: str,
        rarity: str,
    ) -> Figure:
        figure = Figure(
            user_id=user_id,
            mint_number=mint_number,
            display_number=display_number,
            rarity=rarity,
            status=FigureStatus.DRAFT.value,
        )
        session.add(figure)
        return figure

    async def update_presets(
        self,
        session: AsyncSession,
        figure: Figure,
        presets: FigurePresetsUpdateRequest,
    ) -> Figure:
        if "selected_color" in presets.model_fields_set:
            figure.selected_color = (
                presets.selected_color.value
                if presets.selected_color is not None
                else None
            )
        if "selected_vibe" in presets.model_fields_set:
            figure.selected_vibe = (
                presets.selected_vibe.value
                if presets.selected_vibe is not None
                else None
            )
        if "selected_accessory" in presets.model_fields_set:
            figure.selected_accessory = (
                presets.selected_accessory.value
                if presets.selected_accessory is not None
                else None
            )
        if "selected_background" in presets.model_fields_set:
            figure.selected_background = (
                presets.selected_background.value
                if presets.selected_background is not None
                else None
            )
        if presets.rarity is not None:
            figure.rarity = presets.rarity.value
        if presets.is_public is not None:
            figure.is_public = presets.is_public

        session.add(figure)
        return figure
