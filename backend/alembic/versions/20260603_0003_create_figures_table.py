"""create figures table

Revision ID: 20260603_0003
Revises: 20260603_0002
Create Date: 2026-06-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260603_0003"
down_revision: str | None = "20260603_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE figure_mint_number_seq START 1")
    op.create_table(
        "figures",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("mint_number", sa.Integer(), nullable=False),
        sa.Column("display_number", sa.String(length=32), nullable=False),
        sa.Column("rarity", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("selected_color", sa.String(length=255), nullable=True),
        sa.Column("selected_vibe", sa.String(length=255), nullable=True),
        sa.Column("selected_accessory", sa.String(length=255), nullable=True),
        sa.Column("selected_background", sa.String(length=255), nullable=True),
        sa.Column("source_photo_type", sa.String(length=255), nullable=True),
        sa.Column("source_photo_url", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("share_image_url", sa.Text(), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column(
            "safe_prompt_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "traits_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("generation_attempts", sa.Integer(), nullable=False),
        sa.Column("last_generation_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mint_number", name="uq_figures_mint_number"),
        sa.UniqueConstraint("user_id", name="uq_figures_user_id"),
    )
    op.create_index("ix_figures_is_public", "figures", ["is_public"], unique=False)
    op.create_index("ix_figures_rarity", "figures", ["rarity"], unique=False)
    op.create_index("ix_figures_status", "figures", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_figures_status", table_name="figures")
    op.drop_index("ix_figures_rarity", table_name="figures")
    op.drop_index("ix_figures_is_public", table_name="figures")
    op.drop_table("figures")
    op.execute("DROP SEQUENCE figure_mint_number_seq")
