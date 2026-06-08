import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.figure import Figure
from app.models.generation_job import GenerationJob
from app.models.user import User

logger = logging.getLogger(__name__)


def write_generation_audit_event(
    event: str,
    *,
    user: User | None,
    figure: Figure,
    job: GenerationJob,
) -> None:
    log_path = settings.GENERATION_AUDIT_LOG_PATH.strip()
    if not log_path:
        logger.debug("generation audit log disabled event=%s job_id=%s", event, job.id)
        return

    record = {
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "event": event,
        "user": _serialize_user(user),
        "figure": _serialize_figure(figure),
        "job": _serialize_job(job),
        "generation": _serialize_generation(job),
    }

    path = Path(log_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as file:
            json.dump(record, file, ensure_ascii=False, separators=(",", ":"))
            file.write("\n")
        logger.debug(
            "generation audit log written path=%s event=%s job_id=%s",
            path,
            event,
            job.id,
        )
    except OSError:
        logger.warning(
            "generation audit log write failed path=%s event=%s job_id=%s",
            path,
            event,
            job.id,
            exc_info=True,
        )


def _serialize_user(user: User | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": str(user.id),
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


def _serialize_figure(figure: Figure) -> dict[str, Any]:
    return {
        "id": str(figure.id),
        "user_id": str(figure.user_id),
        "display_number": figure.display_number,
        "rarity": figure.rarity,
        "foil_rarity": figure.foil_rarity,
        "status": figure.status,
        "selected_color": figure.selected_color,
        "selected_vibe": figure.selected_vibe,
        "selected_accessory": figure.selected_accessory,
        "selected_background": figure.selected_background,
        "source_photo_type": figure.source_photo_type,
        "has_source_photo": bool(figure.source_photo_url),
    }


def _serialize_job(job: GenerationJob) -> dict[str, Any]:
    return {
        "id": str(job.id),
        "status": job.status,
        "mode": settings.GENERATION_MODE.strip().lower(),
        "model": job.model,
        "attempt": job.attempt,
        "max_attempts": job.max_attempts,
        "started_at": _format_datetime(job.started_at),
        "completed_at": _format_datetime(job.completed_at),
    }


def _serialize_generation(job: GenerationJob) -> dict[str, Any]:
    return {
        "prompt": job.prompt,
        "foil_prompt": job.foil_prompt,
        "result_image_url": job.result_image_url,
        "foil_result_image_url": job.foil_result_image_url,
        "error_code": job.error_code,
        "error_message": job.error_message,
    }


def _format_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
