import secrets
import string

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.link import Link
from app.models.user import User
from app.schemas.link import LinkCreate

ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
MAX_ATTEMPTS = 5


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


def list_links(db: Session, owner: User | None) -> list[Link]:
    return list(db.scalars(select(Link).where(_owned_by(owner)).order_by(Link.id.desc())))


# Someone else's link is "not found": don't reveal which ids exist.
def get_link(db: Session, link_id: int, owner: User | None) -> Link:
    link = db.scalar(select(Link).where(Link.id == link_id, _owned_by(owner)))
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def delete_link(db: Session, link_id: int, owner: User | None) -> None:
    db.delete(get_link(db, link_id, owner))
    db.commit()


# One atomic UPDATE: the database increments under its row lock, so concurrent clicks are never lost
# (a read-then-write in Python would let two requests read the same value and save n+1 twice).
def resolve_and_count(db: Session, code: str) -> str:
    url = db.scalar(update(Link).where(Link.code == code).values(clicks=Link.clicks + 1).returning(Link.url))
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    db.commit()
    return url
