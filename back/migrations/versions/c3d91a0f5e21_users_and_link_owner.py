"""users and link owner

Existing links are dropped (decided with the product owner): they had no owner.

Revision ID: c3d91a0f5e21
Revises: b7e812377d99
Create Date: 2026-09-25 18:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d91a0f5e21"
down_revision: str | Sequence[str] | None = "b7e812377d99"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("links")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("clicks", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_links_owner_id", "links", ["owner_id"])
    # A URL is unique per owner; anonymous links (owner_id NULL) share one namespace.
    op.create_index(
        "uq_links_owner_url", "links", ["owner_id", "url"], unique=True,
        postgresql_where=sa.text("owner_id IS NOT NULL"), sqlite_where=sa.text("owner_id IS NOT NULL"),
    )
    op.create_index(
        "uq_links_anonymous_url", "links", ["url"], unique=True,
        postgresql_where=sa.text("owner_id IS NULL"), sqlite_where=sa.text("owner_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_table("links")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.create_table(
        "links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("clicks", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_links_url", "links", ["url"], unique=True)
