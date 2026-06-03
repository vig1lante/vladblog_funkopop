from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from app.core.database import Base
from app.enums.figure import FigureStatus
from app.models.user import User, utc_now


class Figure(Base):
    __tablename__ = "figures"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_figures_user_id"),
        UniqueConstraint("mint_number", name="uq_figures_mint_number"),
        Index("ix_figures_rarity", "rarity"),
        Index("ix_figures_status", "status"),
        Index("ix_figures_is_public", "is_public"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    mint_number: Mapped[int] = mapped_column(Integer, nullable=False)
    display_number: Mapped[str] = mapped_column(String(32), nullable=False)
    rarity: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(64),
        default=FigureStatus.DRAFT.value,
        nullable=False,
    )
    selected_color: Mapped[str | None] = mapped_column(String(255), nullable=True)
    selected_vibe: Mapped[str | None] = mapped_column(String(255), nullable=True)
    selected_accessory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    selected_background: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_photo_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    share_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    safe_prompt_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    traits_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    generation_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_generation_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    user: Mapped[User] = relationship("User", backref="figure")
