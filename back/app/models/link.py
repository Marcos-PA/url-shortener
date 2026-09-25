from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Link(Base):
    __tablename__ = "links"
    # A URL is unique per owner; anonymous links (owner_id NULL) share one namespace.
    __table_args__ = (
        Index(
            "uq_links_owner_url", "owner_id", "url", unique=True,
            postgresql_where=text("owner_id IS NOT NULL"), sqlite_where=text("owner_id IS NOT NULL"),
        ),
        Index(
            "uq_links_anonymous_url", "url", unique=True,
            postgresql_where=text("owner_id IS NULL"), sqlite_where=text("owner_id IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(2048))
    code: Mapped[str] = mapped_column(String(16), unique=True)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    # Always set by the app; nullable in the table only because SQLite can't add a NOT NULL column with a
    # non-constant default to an existing table (see migration d4e5f6a7b8c9).
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, default=lambda: datetime.now(UTC)
    )
