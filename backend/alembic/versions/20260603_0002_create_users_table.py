"""create users table

Revision ID: 20260603_0002
Revises: 20260602_0001
Create Date: 2026-06-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260603_0002"
down_revision: str | None = "20260602_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    sa_uuid = sa.Uuid()
    op.create_table(
        "users",
        sa.Column("id", sa_uuid, nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=True),
        sa.Column("first_name", sa.String(length=255), nullable=True),
        sa.Column("last_name", sa.String(length=255), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("language_code", sa.String(length=16), nullable=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False),
        sa.Column("is_channel_member", sa.Boolean(), nullable=False),
        sa.Column("is_banned", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("telegram_id"),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_telegram_id", table_name="users")
    op.drop_table("users")
