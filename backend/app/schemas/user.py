from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
