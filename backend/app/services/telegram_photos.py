import json
import logging
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from app.core.config import settings

logger = logging.getLogger(__name__)


def download_telegram_profile_photo(telegram_id: int) -> bytes | None:
    try:
        photos = _telegram_api_json("getUserProfilePhotos", user_id=telegram_id, limit=1)
        if not photos.get("ok"):
            return None
        photo_sets = photos.get("result", {}).get("photos", [])
        if not photo_sets:
            return None

        largest_photo = photo_sets[0][-1]
        file_id = largest_photo.get("file_id")
        if not file_id:
            return None

        file_response = _telegram_api_json("getFile", file_id=file_id)
        if not file_response.get("ok"):
            return None
        file_path = file_response.get("result", {}).get("file_path")
        if not file_path:
            return None

        file_url = (
            f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/"
            f"{file_path}"
        )
        with urlopen(file_url, timeout=4) as response:
            return response.read()
    except (KeyError, TypeError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning(
            "telegram profile photo download failed telegram_id=%s error=%s",
            telegram_id,
            exc.__class__.__name__,
        )
        return None


def inspect_telegram_profile_photo(
    telegram_id: int,
    stored_user_photo_url: bool = False,
) -> dict:
    result = {
        "telegram_id": telegram_id,
        "stored_user_photo_url": stored_user_photo_url,
        "status": "unknown",
        "get_user_profile_photos": None,
        "get_file": None,
    }
    try:
        photos = _telegram_api_json("getUserProfilePhotos", user_id=telegram_id, limit=1)
        photo_sets = photos.get("result", {}).get("photos", [])
        result["get_user_profile_photos"] = {
            "ok": photos.get("ok"),
            "description": photos.get("description"),
            "total_count": photos.get("result", {}).get("total_count"),
            "photo_sets_count": len(photo_sets),
        }
        if not photos.get("ok"):
            result["status"] = "getUserProfilePhotos_failed"
            return result
        if not photo_sets:
            result["status"] = "no_profile_photos_visible_to_bot"
            return result

        largest_photo = photo_sets[0][-1]
        file_id = largest_photo.get("file_id")
        result["get_user_profile_photos"]["first_file_id_present"] = bool(file_id)
        if not file_id:
            result["status"] = "photo_without_file_id"
            return result

        file_response = _telegram_api_json("getFile", file_id=file_id)
        file_path = file_response.get("result", {}).get("file_path")
        result["get_file"] = {
            "ok": file_response.get("ok"),
            "description": file_response.get("description"),
            "file_path_present": bool(file_path),
        }
        result["status"] = "downloadable" if file_path else "getFile_without_path"
        return result
    except (KeyError, TypeError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        result["status"] = "request_failed"
        result["message"] = exc.__class__.__name__
        logger.warning(
            "telegram profile photo api failed telegram_id=%s error=%s",
            telegram_id,
            exc.__class__.__name__,
        )
        return result


def _telegram_api_json(method: str, **params: object) -> dict:
    query = urlencode(params)
    url = (
        f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}?"
        f"{query}"
    )
    with urlopen(url, timeout=4) as response:
        return json.loads(response.read().decode("utf-8"))
