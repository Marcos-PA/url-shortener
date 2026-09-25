import secrets
import string
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.link import Link
from app.models.user import User
from app.schemas.link import LinkCreate

ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
MAX_ATTEMPTS = 5


def _anonymous_cutoff() -> datetime:
    return datetime.now(UTC) - timedelta(hours=settings.ANONYMOUS_LINK_TTL_HOURS)


def _alive():
    """Links with an owner never expire; anonymous ones live ANONYMOUS_LINK_TTL_HOURS."""
    return or_(Link.owner_id.is_not(None), Link.created_at > _anonymous_cutoff())


# ponytail: no cron on Render free, so expired anonymous links are purged whenever a link is created;
# until then _alive() already hides them from redirects and the ranking. Add a cron job if the table grows.
def purge_expired_links(db: Session) -> None:
    db.execute(delete(Link).where(Link.owner_id.is_(None), Link.created_at <= _anonymous_cutoff()))
    db.commit()


def generate_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))


def _owned_by(owner: User | None):
    return Link.owner_id.is_(None) if owner is None else Link.owner_id == owner.id


def _ensure_url_is_new(db: Session, url: str, owner: User | None) -> None:
    if db.scalar(select(Link.id).where(Link.url == url, _owned_by(owner))) is not None:
        raise HTTPException(status_code=409, detail="This URL has already been shortened")


def _insert(db: Session, url: str, code: str, owner: User | None) -> Link | None:
    """Insert the link; None if the code is already taken (409 if it was the URL instead)."""
    link = Link(url=url, code=code, clicks=0, owner_id=owner.id if owner else None)
    db.add(link)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        _ensure_url_is_new(db, url, owner)  # lost the race to the same URL; otherwise the code was taken
        return None
    db.refresh(link)
    return link


# Uniqueness of code and url comes from UNIQUE constraints: the pre-check below only gives a friendly
# 409; two simultaneous requests for the same URL or code are still caught by the constraint.
# Codes are global (they are the public path); URLs are unique per owner.
def create_link(db: Session, data: LinkCreate, owner: User | None) -> Link:
    url = str(data.url)
    purge_expired_links(db)  # also frees the URL and codes of expired anonymous links
    _ensure_url_is_new(db, url, owner)
    if data.personal_link:
        link = _insert(db, url, data.personal_link, owner)
        if link is None:
            raise HTTPException(status_code=409, detail="This personal link is already taken")
        return link
    for _ in range(MAX_ATTEMPTS):
        if link := _insert(db, url, generate_code(), owner):
            return link
    raise HTTPException(status_code=503, detail="Could not generate a unique short code, try again")


def list_links(db: Session, owner: User) -> list[Link]:
    return list(db.scalars(select(Link).where(Link.owner_id == owner.id).order_by(Link.id.desc())))


TOP_LIMIT = 10


# Across every owner, most clicked first; ties go to the oldest link. Links never clicked are left out.
def list_top_links(db: Session) -> list[Link]:
    query = select(Link).where(Link.clicks > 0, _alive()).order_by(Link.clicks.desc(), Link.id).limit(TOP_LIMIT)
    return list(db.scalars(query))


# Someone else's link is "not found": don't reveal which ids exist.
def get_link(db: Session, link_id: int, owner: User) -> Link:
    link = db.scalar(select(Link).where(Link.id == link_id, Link.owner_id == owner.id))
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def delete_link(db: Session, link_id: int, owner: User) -> None:
    db.delete(get_link(db, link_id, owner))
    db.commit()


# One atomic UPDATE: the database increments under its row lock, so concurrent clicks are never lost
# (a read-then-write in Python would let two requests read the same value and save n+1 twice).
def resolve_and_count(db: Session, code: str) -> str:
    url = db.scalar(
        update(Link).where(Link.code == code, _alive()).values(clicks=Link.clicks + 1).returning(Link.url)
    )
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    db.commit()
    return url
