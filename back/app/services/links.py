import secrets
import string

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.link import Link
from app.schemas.link import LinkCreate

ALPHABET = string.ascii_letters + string.digits
CODE_LENGTH = 7
MAX_ATTEMPTS = 5


def generate_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))


# Uniqueness comes from the UNIQUE constraint: a check-then-insert would race between two requests.
def create_link(db: Session, data: LinkCreate) -> Link:
    for _ in range(MAX_ATTEMPTS):
        link = Link(url=str(data.url), code=generate_code(), clicks=0)
        db.add(link)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(link)
        return link
    raise HTTPException(status_code=503, detail="Could not generate a unique short code, try again")


def list_links(db: Session) -> list[Link]:
    return list(db.scalars(select(Link).order_by(Link.id.desc())))


# One atomic UPDATE: the database increments under its row lock, so concurrent clicks are never lost
# (a read-then-write in Python would let two requests read the same value and save n+1 twice).
def resolve_and_count(db: Session, code: str) -> str:
    url = db.scalar(update(Link).where(Link.code == code).values(clicks=Link.clicks + 1).returning(Link.url))
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    db.commit()
    return url
