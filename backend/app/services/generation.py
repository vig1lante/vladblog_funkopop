import asyncio
import base64
import logging
import mimetypes
from collections.abc import Mapping
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.openai_client import OpenAIClientConfigError, get_openai_client
from app.enums.figure import FigureStatus, GenerationJobStatus
from app.enums.presets import SourcePhotoType
from app.models.figure import Figure
from app.models.generation_job import GenerationJob
from app.models.user import User, utc_now
from app.repositories.figures import FiguresRepository
from app.services.figures import has_generation_presets
from app.services.generation_audit import write_generation_audit_event
from app.services.media_storage import LocalMediaStorage
from app.services.prompts import build_figure_prompt
from app.services.rarity import get_base_rarity, get_foil_rarity
from app.services.telegram_photos import download_telegram_profile_photo

logger = logging.getLogger(__name__)


class FigureGenerationError(ValueError):
    pass


class OpenAIImageGenerationError(FigureGenerationError):
    pass


def get_generation_mode() -> str:
    return settings.GENERATION_MODE.strip().lower()


DISABLED_GENERATION_MODES = {"0", "false", "off", "disabled", "none", "no"}


def is_generation_enabled() -> bool:
    return (
        settings.GENERATION_ENABLED
        and get_generation_mode() not in DISABLED_GENERATION_MODES
    )


def ensure_generation_enabled() -> None:
    if not is_generation_enabled():
        raise FigureGenerationError("Figure generation is disabled")


async def create_generation_job(session: AsyncSession, user: User) -> GenerationJob:
    figure = await FiguresRepository().get_by_user_id(session, user.id)
    if figure is None:
        raise FigureGenerationError("Figure not found")

    now = utc_now()
    mode = get_generation_mode()
    model = settings.OPENAI_IMAGE_MODEL if mode == "openai" else mode
    job = GenerationJob(
        figure_id=figure.id,
        user_id=user.id,
        status=GenerationJobStatus.PENDING.value,
        model=model,
        attempt=figure.generation_attempts + 1,
        max_attempts=settings.OPENAI_IMAGE_MAX_ATTEMPTS,
        started_at=now,
    )
    session.add(job)
    await session.flush()
    logger.info(
        "generation job created user_id=%s figure_id=%s job_id=%s attempt=%s model=%s",
        user.id,
        figure.id,
        job.id,
        job.attempt,
        job.model,
    )
    write_generation_audit_event(
        "generation_job_created",
        user=user,
        figure=figure,
        job=job,
    )
    return job


async def run_generation_job(
    session: AsyncSession,
    job_id: UUID,
) -> GenerationJob:
    job = await session.get(GenerationJob, job_id)
    if job is None:
        raise FigureGenerationError("Generation job not found")

    figure = await session.get(Figure, job.figure_id)
    if figure is None:
        raise FigureGenerationError("Figure not found")

    ensure_generation_enabled()

    logger.info(
        "generation job dispatch user_id=%s figure_id=%s job_id=%s mode=%s status=%s",
        job.user_id,
        figure.id,
        job.id,
        get_generation_mode(),
        job.status,
    )

    mode = get_generation_mode()
    logger.info("Generation mode: %s", mode)

    if mode == "mock":
        return await run_mock_generation(session, job, figure)

    if mode == "openai":
        return await run_openai_generation(session, job, figure)

    raise FigureGenerationError("Unsupported generation mode")


async def run_generation_job_background(job_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        try:
            await run_generation_job(session, job_id)
        except Exception as exc:
            logger.exception("background generation failed job_id=%s", job_id)
            await session.rollback()
            await _mark_background_generation_failed(session, job_id, exc)


async def run_mock_generation(
    session: AsyncSession,
    job: GenerationJob,
    figure: Figure,
) -> GenerationJob:
    foil_rarity = figure.foil_rarity or get_foil_rarity(figure.rarity)
    foil_prompt = job.foil_prompt or figure.foil_prompt or build_figure_prompt(
        figure,
        rarity=foil_rarity,
    )
    result_url = LocalMediaStorage().ensure_mock_generated_figure(
        figure.display_number,
        figure.rarity,
    )
    foil_result_url = LocalMediaStorage().ensure_mock_generated_figure(
        figure.display_number,
        foil_rarity,
        variant="foil",
    )
    job.status = GenerationJobStatus.COMPLETED.value
    job.result_image_url = result_url
    job.foil_prompt = foil_prompt
    job.foil_result_image_url = foil_result_url
    job.completed_at = utc_now()
    figure.status = FigureStatus.COMPLETED.value
    figure.image_url = result_url
    figure.foil_rarity = foil_rarity
    figure.foil_image_url = foil_result_url
    figure.foil_prompt = foil_prompt
    figure.generation_attempts += 1
    figure.last_generation_error = None

    session.add_all([job, figure])
    await session.commit()
    await session.refresh(job)
    user = await session.get(User, job.user_id)
    write_generation_audit_event(
        "generation_completed",
        user=user,
        figure=figure,
        job=job,
    )
    logger.info(
        "mock generation completed figure_id=%s job_id=%s result_url_present=%s",
        figure.id,
        job.id,
        bool(result_url),
    )
    return job


async def run_openai_generation(
    session: AsyncSession,
    job: GenerationJob,
    figure: Figure,
) -> GenerationJob:
    try:
        client = get_openai_client()
        figure.generation_attempts += 1
        normal_prompt = job.prompt or build_figure_prompt(figure)
        foil_rarity = figure.foil_rarity or get_foil_rarity(figure.rarity)
        foil_prompt = job.foil_prompt or build_figure_prompt(
            figure,
            rarity=foil_rarity,
        )
        logger.info(
            "openai generation started user_id=%s figure_id=%s job_id=%s "
            "model=%s size=%s quality=%s source_photo_type=%s "
            "has_source_photo=%s prompt_chars=%s",
            job.user_id,
            figure.id,
            job.id,
            settings.OPENAI_IMAGE_MODEL,
            settings.OPENAI_IMAGE_SIZE,
            settings.OPENAI_IMAGE_QUALITY,
            figure.source_photo_type,
            bool(figure.source_photo_url),
            len(job.prompt or ""),
        )
        await _normalize_telegram_reference_photo(session, job, figure)
        await session.commit()
        image_bytes, foil_image_bytes = await asyncio.gather(
            asyncio.to_thread(
                _generate_openai_image,
                client,
                figure,
                normal_prompt,
            ),
            asyncio.to_thread(
                _generate_openai_image,
                client,
                figure,
                foil_prompt,
            ),
        )
        result_url = LocalMediaStorage().save_generated_figure(
            figure.id,
            job.id,
            image_bytes,
        )
        foil_result_url = LocalMediaStorage().save_generated_figure(
            figure.id,
            job.id,
            foil_image_bytes,
            variant="foil",
        )
    except OpenAIClientConfigError:
        raise
    except Exception as exc:
        logger.exception(
            "openai image generation failed user_id=%s figure_id=%s job_id=%s error=%s",
            job.user_id,
            figure.id,
            job.id,
            _openai_error_context(exc),
        )
        await _mark_generation_failed(session, job, figure)
        raise OpenAIImageGenerationError(
            "Не получилось сгенерировать фигурку. Попробуй другое фото или режим "
            "“Без фото”."
        ) from exc

    job.status = GenerationJobStatus.COMPLETED.value
    job.prompt = normal_prompt
    job.result_image_url = result_url
    job.foil_prompt = foil_prompt
    job.foil_result_image_url = foil_result_url
    job.completed_at = utc_now()
    job.error_code = None
    job.error_message = None
    figure.status = FigureStatus.COMPLETED.value
    figure.image_url = result_url
    figure.prompt = normal_prompt
    figure.foil_rarity = foil_rarity
    figure.foil_image_url = foil_result_url
    figure.foil_prompt = foil_prompt
    figure.last_generation_error = None

    session.add_all([job, figure])
    await session.commit()
    await session.refresh(job)
    user = await session.get(User, job.user_id)
    write_generation_audit_event(
        "generation_completed",
        user=user,
        figure=figure,
        job=job,
    )
    logger.info(
        "openai generation completed user_id=%s figure_id=%s job_id=%s bytes=%s",
        job.user_id,
        figure.id,
        job.id,
        len(image_bytes) + len(foil_image_bytes),
    )
    return job


class FigureGenerationService:
    def __init__(self, figures_repository: FiguresRepository | None = None) -> None:
        self.figures_repository = figures_repository or FiguresRepository()

    async def start_my_figure_generation(
        self,
        session: AsyncSession,
        user: User,
    ) -> tuple[GenerationJob, Figure] | None:
        figure = await self.figures_repository.get_by_user_id(session, user.id)
        if figure is None:
            return None

        ensure_generation_enabled()

        active_job = await self.figures_repository.get_active_job_by_figure_id(
            session,
            figure.id,
        )
        if active_job is not None:
            logger.info(
                "generation reused active job user_id=%s figure_id=%s "
                "job_id=%s status=%s",
                user.id,
                figure.id,
                active_job.id,
                active_job.status,
            )
            write_generation_audit_event(
                "generation_reused_active_job",
                user=user,
                figure=figure,
                job=active_job,
            )
            return active_job, figure

        self._validate_figure(figure)
        mode = get_generation_mode()
        if mode not in {"mock", "openai"}:
            raise FigureGenerationError("Unsupported generation mode")
        if mode == "openai" and not settings.OPENAI_API_KEY.strip():
            raise FigureGenerationError("OPENAI_API_KEY is required for openai mode")

        job = await create_generation_job(session, user)
        job._start_background = True
        logger.info(
            "start generation user_id=%s figure_id=%s job_id=%s mode=%s",
            user.id,
            figure.id,
            job.id,
            mode,
        )
        job.status = GenerationJobStatus.PREPARING_PROMPT.value
        base_rarity = get_base_rarity(figure.rarity)
        foil_rarity = get_foil_rarity(base_rarity)
        figure.rarity = base_rarity
        figure.foil_rarity = foil_rarity
        figure.foil_image_url = None
        prompt = build_figure_prompt(figure, user, rarity=base_rarity)
        foil_prompt = build_figure_prompt(figure, user, rarity=foil_rarity)
        job.prompt = prompt
        job.foil_prompt = foil_prompt
        figure.prompt = prompt
        figure.foil_prompt = foil_prompt
        logger.info(
            "generation prompt prepared user_id=%s figure_id=%s job_id=%s "
            "prompt_chars=%s foil_prompt_chars=%s",
            user.id,
            figure.id,
            job.id,
            len(prompt),
            len(foil_prompt),
        )

        job.status = GenerationJobStatus.GENERATING.value
        figure.status = FigureStatus.GENERATING.value
        session.add_all([job, figure])
        await session.flush()
        logger.info(
            "generation status set user_id=%s figure_id=%s job_id=%s status=%s",
            user.id,
            figure.id,
            job.id,
            job.status,
        )
        await session.commit()
        await session.refresh(job)
        await session.refresh(figure)
        return job, figure

    async def generate_my_figure(
        self,
        session: AsyncSession,
        user: User,
    ) -> tuple[GenerationJob, Figure] | None:
        result = await self.start_my_figure_generation(session, user)
        if result is None:
            return None
        job, figure = result

        try:
            job = await run_generation_job(session, job.id)
        except OpenAIClientConfigError as exc:
            await _mark_generation_failed(
                session,
                job,
                figure,
                code="openai_api_key_missing",
                message="OPENAI_API_KEY is required for openai mode",
            )
            raise FigureGenerationError(str(exc)) from exc

        await session.refresh(job)
        await session.refresh(figure)
        logger.info(
            "generation completed user_id=%s figure_id=%s job_id=%s",
            user.id,
            figure.id,
            job.id,
        )
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

        if figure.generation_attempts >= settings.OPENAI_IMAGE_MAX_ATTEMPTS:
            raise FigureGenerationError("Generation attempt limit reached")

        if (
            figure.source_photo_type == SourcePhotoType.UPLOADED.value
            and not figure.source_photo_url
        ):
            raise FigureGenerationError("Uploaded source photo is missing")

        if (
            figure.source_photo_type == SourcePhotoType.TELEGRAM_PROFILE.value
            and not figure.source_photo_url
        ):
            raise FigureGenerationError("Telegram profile source photo is missing")


async def _normalize_telegram_reference_photo(
    session: AsyncSession,
    job: GenerationJob,
    figure: Figure,
) -> None:
    if figure.source_photo_type != SourcePhotoType.TELEGRAM_PROFILE.value:
        return
    if _is_supported_reference_url(figure.source_photo_url):
        return

    user = await session.get(User, job.user_id)
    if user is None:
        logger.warning(
            "telegram reference normalization skipped job_id=%s reason=user_not_found",
            job.id,
        )
        return

    logger.info(
        "telegram reference normalization started user_id=%s figure_id=%s "
        "job_id=%s current_host=%s",
        user.id,
        figure.id,
        job.id,
        urlparse(figure.source_photo_url or "").netloc,
    )
    photo_bytes = await asyncio.to_thread(
        download_telegram_profile_photo,
        user.telegram_id,
    )
    if not photo_bytes:
        logger.warning(
            "telegram reference normalization failed user_id=%s figure_id=%s job_id=%s",
            user.id,
            figure.id,
            job.id,
        )
        return

    photo_url = LocalMediaStorage().save_telegram_profile_photo(user.id, photo_bytes)
    user.photo_url = photo_url
    figure.source_photo_url = photo_url
    session.add_all([user, figure])
    await session.flush()
    logger.info(
        "telegram reference normalized user_id=%s figure_id=%s job_id=%s bytes=%s",
        user.id,
        figure.id,
        job.id,
        len(photo_bytes),
    )


def _is_supported_reference_url(source_photo_url: str | None) -> bool:
    if not source_photo_url:
        return False
    local_path = _local_media_path_from_url(source_photo_url)
    if local_path is not None:
        return True
    suffix = Path(urlparse(source_photo_url).path).suffix.lower()
    return suffix in {".jpg", ".jpeg", ".png", ".webp"}


def _generate_openai_image(client: object, figure: Figure, prompt: str) -> bytes:
    if figure.source_photo_type in {
        SourcePhotoType.TELEGRAM_PROFILE.value,
        SourcePhotoType.UPLOADED.value,
    }:
        if not figure.source_photo_url:
            raise ValueError("Source photo is missing")
        with _open_reference_image(figure.source_photo_url) as image_file:
            logger.info(
                "openai images.edit request figure_id=%s model=%s size=%s quality=%s",
                figure.id,
                settings.OPENAI_IMAGE_MODEL,
                settings.OPENAI_IMAGE_SIZE,
                settings.OPENAI_IMAGE_QUALITY,
            )
            response = client.images.edit(
                model=settings.OPENAI_IMAGE_MODEL,
                image=image_file,
                prompt=prompt,
                n=1,
                size=settings.OPENAI_IMAGE_SIZE,
                quality=settings.OPENAI_IMAGE_QUALITY,
            )
    else:
        logger.info(
            "openai images.generate request figure_id=%s model=%s size=%s quality=%s",
            figure.id,
            settings.OPENAI_IMAGE_MODEL,
            settings.OPENAI_IMAGE_SIZE,
            settings.OPENAI_IMAGE_QUALITY,
        )
        response = client.images.generate(
            model=settings.OPENAI_IMAGE_MODEL,
            prompt=prompt,
            n=1,
            size=settings.OPENAI_IMAGE_SIZE,
            quality=settings.OPENAI_IMAGE_QUALITY,
        )

    return _extract_image_bytes(response)


def _extract_image_bytes(response: object) -> bytes:
    data = getattr(response, "data", None)
    if not data:
        raise ValueError("OpenAI image response did not include image data")

    image = data[0]
    b64_json = getattr(image, "b64_json", None)
    if b64_json:
        return base64.b64decode(b64_json)

    image_url = getattr(image, "url", None)
    if image_url:
        with urlopen(image_url, timeout=20) as response_file:
            return response_file.read()

    raise ValueError("OpenAI image response did not include b64_json or url")


def _open_reference_image(source_photo_url: str):
    local_path = _local_media_path_from_url(source_photo_url)
    if local_path is not None:
        logger.info("reference image opened source=local path=%s", local_path)
        return local_path.open("rb")

    parsed = urlparse(source_photo_url)
    suffix = Path(parsed.path).suffix or ".jpg"
    with urlopen(source_photo_url, timeout=20) as response:
        image_file = BytesIO(response.read())
    image_file.name = f"reference{suffix}"
    logger.info("reference image downloaded source=remote host=%s", parsed.netloc)
    return image_file


def _local_media_path_from_url(source_photo_url: str) -> Path | None:
    parsed = urlparse(source_photo_url)
    if not parsed.scheme and source_photo_url.startswith("/media/"):
        relative_path = source_photo_url.removeprefix("/media/")
        return Path(settings.LOCAL_STORAGE_PATH) / relative_path

    base = settings.PUBLIC_MEDIA_BASE_URL.rstrip("/")
    if source_photo_url.startswith(f"{base}/"):
        relative_path = source_photo_url.removeprefix(f"{base}/")
        return Path(settings.LOCAL_STORAGE_PATH) / relative_path

    content_type, _ = mimetypes.guess_type(source_photo_url)
    if parsed.scheme == "file" and content_type and content_type.startswith("image/"):
        path = Path(parsed.path)
        if path.is_file():
            return path

    return None


async def _mark_generation_failed(
    session: AsyncSession,
    job: GenerationJob,
    figure: Figure,
    code: str = "openai_generation_failed",
    message: str = (
        "Не получилось сгенерировать фигурку. Попробуй другое фото или режим "
        "“Без фото”."
    ),
) -> None:
    logger.warning(
        "generation marked failed user_id=%s figure_id=%s job_id=%s code=%s message=%s",
        job.user_id,
        figure.id,
        job.id,
        code,
        message,
    )
    job.status = GenerationJobStatus.FAILED.value
    job.error_code = code
    job.error_message = message
    job.completed_at = utc_now()
    figure.status = FigureStatus.FAILED.value
    figure.last_generation_error = message
    session.add_all([job, figure])
    await session.commit()
    user = await session.get(User, job.user_id)
    write_generation_audit_event(
        "generation_failed",
        user=user,
        figure=figure,
        job=job,
    )


async def _mark_background_generation_failed(
    session: AsyncSession,
    job_id: UUID,
    exc: Exception,
) -> None:
    job = await session.get(GenerationJob, job_id)
    if job is None:
        logger.warning(
            "background generation failure not persisted job_id=%s "
            "reason=job_not_found",
            job_id,
        )
        return
    if job.status == GenerationJobStatus.FAILED.value:
        return

    figure = await session.get(Figure, job.figure_id)
    if figure is None:
        job.status = GenerationJobStatus.FAILED.value
        job.error_code = "background_generation_failed"
        job.error_message = "Generation failed unexpectedly"
        job.completed_at = utc_now()
        session.add(job)
        await session.commit()
        return

    await _mark_generation_failed(
        session,
        job,
        figure,
        code="background_generation_failed",
        message="Generation failed unexpectedly",
    )
    logger.warning(
        "background generation marked failed job_id=%s error_class=%s",
        job_id,
        exc.__class__.__name__,
    )


def _openai_error_context(exc: Exception) -> dict[str, object]:
    context: dict[str, object] = {
        "class": exc.__class__.__name__,
        "message": str(exc)[:500],
    }
    for attr in ("status_code", "code", "type", "param"):
        value = getattr(exc, attr, None)
        if value:
            context[attr] = value
    response = getattr(exc, "response", None)
    if response is not None:
        status_code = getattr(response, "status_code", None)
        if status_code:
            context["response_status_code"] = status_code
    body = getattr(exc, "body", None)
    if isinstance(body, Mapping):
        context["body_keys"] = sorted(str(key) for key in body.keys())
    return context
