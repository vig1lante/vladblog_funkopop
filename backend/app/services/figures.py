from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.figure import FigureStatus
from app.enums.presets import SourcePhotoType
from app.models.figure import Figure
from app.models.user import User
from app.repositories.figures import FiguresRepository
from app.schemas.figure import FigurePresetsUpdateRequest
from app.services.rarity import roll_rarity


def format_display_number(mint_number: int) -> str:
    return f"#{mint_number:04d}"


class TelegramProfilePhotoUnavailableError(ValueError):
    pass


def has_generation_presets(figure: Figure) -> bool:
    return all(
        [
            figure.selected_color,
            figure.selected_vibe,
            figure.selected_accessory,
            figure.selected_background,
            figure.source_photo_type,
        ]
    )


class FigureService:
    def __init__(self, figures_repository: FiguresRepository | None = None) -> None:
        self.figures_repository = figures_repository or FiguresRepository()

    async def get_my_figure(self, session: AsyncSession, user: User) -> Figure | None:
        return await self.figures_repository.get_by_user_id(session, user.id)

    async def create_my_figure(self, session: AsyncSession, user: User) -> Figure:
        existing_figure = await self.get_my_figure(session, user)
        if existing_figure:
            return existing_figure

        mint_number = await self.figures_repository.get_next_mint_number(session)
        figure = await self.figures_repository.create(
            session,
            user.id,
            mint_number,
            format_display_number(mint_number),
            roll_rarity(mint_number).value,
        )

        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            existing_figure = await self.get_my_figure(session, user)
            if existing_figure:
                return existing_figure
            raise

        await session.refresh(figure)
        return figure

    async def update_my_presets(
        self,
        session: AsyncSession,
        user: User,
        presets: FigurePresetsUpdateRequest,
    ) -> Figure | None:
        figure = await self.get_my_figure(session, user)
        if figure is None:
            return None

        await self.figures_repository.update_presets(session, figure, presets)
        self._apply_source_photo_choice(figure, user, presets.source_photo_type)
        if has_generation_presets(figure):
            figure.status = FigureStatus.READY_FOR_GENERATION.value

        session.add(figure)
        await session.commit()
        await session.refresh(figure)
        return figure

    async def set_uploaded_source_photo(
        self,
        session: AsyncSession,
        user: User,
        photo_url: str,
    ) -> Figure | None:
        figure = await self.get_my_figure(session, user)
        if figure is None:
            return None

        figure.source_photo_type = SourcePhotoType.UPLOADED.value
        figure.source_photo_url = photo_url
        if has_generation_presets(figure):
            figure.status = FigureStatus.READY_FOR_GENERATION.value

        session.add(figure)
        await session.commit()
        await session.refresh(figure)
        return figure

    def _apply_source_photo_choice(
        self,
        figure: Figure,
        user: User,
        source_photo_type: SourcePhotoType | None,
    ) -> None:
        if source_photo_type is None:
            return

        if source_photo_type == SourcePhotoType.TELEGRAM_PROFILE:
            if not user.photo_url:
                raise TelegramProfilePhotoUnavailableError
            figure.source_photo_type = SourcePhotoType.TELEGRAM_PROFILE.value
            figure.source_photo_url = user.photo_url
            return

        if source_photo_type == SourcePhotoType.NONE:
            figure.source_photo_type = SourcePhotoType.NONE.value
            figure.source_photo_url = None
            return

        previous_photo_url = figure.source_photo_url
        previous_photo_type = figure.source_photo_type
        figure.source_photo_type = SourcePhotoType.UPLOADED.value
        figure.source_photo_url = (
            previous_photo_url
            if previous_photo_type == SourcePhotoType.UPLOADED.value
            else None
        )
