from fastapi import APIRouter

from app.api.deps import OptionalUser
from app.db.session import DbSession
from app.schemas.link import LinkCreate, LinkResponse
from app.services import links as links_service

router = APIRouter(prefix="/links", tags=["links"])


# Logged in: your links. Anonymous: the links without an owner.
@router.get("", response_model=list[LinkResponse])
def list_links(db: DbSession, user: OptionalUser):
    return links_service.list_links(db, user)


@router.post("", response_model=LinkResponse, status_code=201)
def create_link(db: DbSession, user: OptionalUser, link: LinkCreate):
    return links_service.create_link(db, link, user)


@router.delete("/{link_id}", status_code=204)
def delete_link(db: DbSession, user: OptionalUser, link_id: int):
    links_service.delete_link(db, link_id, user)
