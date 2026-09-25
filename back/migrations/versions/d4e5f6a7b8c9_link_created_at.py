"""link created_at (anonymous links expire)

Revision ID: d4e5f6a7b8c9
Revises: c3d91a0f5e21
Create Date: 2026-09-25 20:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: str | Sequence[str] | None = "c3d91a0f5e21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable: SQLite can't ADD COLUMN ... NOT NULL DEFAULT CURRENT_TIMESTAMP. The app always sets it.
    op.add_column("links", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
    # Existing links start their clock now.
    op.execute("UPDATE links SET created_at = CURRENT_TIMESTAMP")


def downgrade() -> None:
    op.drop_column("links", "created_at")
