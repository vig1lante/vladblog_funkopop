"""add foil generation fields

Revision ID: 20260606_0005
Revises: 20260603_0004
Create Date: 2026-06-06 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260606_0005"
down_revision: str | None = "20260603_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "figures",
        sa.Column("foil_rarity", sa.String(length=64), nullable=True),
    )
    op.add_column("figures", sa.Column("foil_image_url", sa.Text(), nullable=True))
    op.add_column("figures", sa.Column("foil_prompt", sa.Text(), nullable=True))
    op.add_column("generation_jobs", sa.Column("foil_prompt", sa.Text(), nullable=True))
    op.add_column(
        "generation_jobs",
        sa.Column("foil_result_image_url", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("generation_jobs", "foil_result_image_url")
    op.drop_column("generation_jobs", "foil_prompt")
    op.drop_column("figures", "foil_prompt")
    op.drop_column("figures", "foil_image_url")
    op.drop_column("figures", "foil_rarity")
