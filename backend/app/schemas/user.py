from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer

from app.services.media_urls import public_media_url


class UserResponse(BaseModel):
    id: UUID
    telegram_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    photo_url: str | None
    language_code: str | None
    is_premium: bool
    is_channel_member: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("photo_url")
    def serialize_photo_url(self, value: str | None) -> str | None:
        return public_media_url(value)
