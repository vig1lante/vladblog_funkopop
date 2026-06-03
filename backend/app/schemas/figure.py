from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.enums.presets import (
    FigureAccessory,
    FigureBackground,
    FigureColor,
    FigureVibe,
    SourcePhotoType,
)


class PresetOption(BaseModel):
    value: str
    label: str


class FigurePresetsResponse(BaseModel):
    colors: list[PresetOption]
    vibes: list[PresetOption]
    accessories: list[PresetOption]
    backgrounds: list[PresetOption]
    source_photo_types: list[PresetOption]


class FigurePresetsUpdateRequest(BaseModel):
    selected_color: FigureColor | None = None
    selected_vibe: FigureVibe | None = None
    selected_accessory: FigureAccessory | None = None
    selected_background: FigureBackground | None = None
    source_photo_type: SourcePhotoType | None = None
    is_public: bool | None = None


class FigureResponse(BaseModel):
    id: UUID
    user_id: UUID
    mint_number: int
    display_number: str
    rarity: str
    status: str
    selected_color: str | None = None
    selected_vibe: str | None = None
    selected_accessory: str | None = None
    selected_background: str | None = None
    source_photo_type: str | None = None
    source_photo_url: str | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None
    share_image_url: str | None = None
    prompt: str | None = None
    description: str | None = None
    traits_json: dict | None = None
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerationJobResponse(BaseModel):
    id: UUID
    figure_id: UUID
    user_id: UUID
    status: str
    model: str | None = None
    prompt: str | None = None
    result_image_url: str | None = None
    attempt: int
    max_attempts: int
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class FigureGenerationResponse(BaseModel):
    job: GenerationJobResponse
    figure: FigureResponse
