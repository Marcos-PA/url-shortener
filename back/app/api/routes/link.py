from fastapi import APIRouter

from app.api.deps import CurrentUser, OptionalUser
from app.db.session import DbSession
from app.schemas.link import LinkCreate, LinkPublic, LinkResponse
from app.services import links as links_service

router = APIRouter(prefix="/links", tags=["links"])


# Only logged-in users have a list: anonymous links are shown just in the page that created them.
@router.get("", response_model=list[LinkResponse])
def list_links(db: DbSession, user: CurrentUser):
    return links_service.list_links(db, user)


# Public ranking: only the link itself, never who owns it.
@router.get("/top", response_model=list[LinkPublic])
def list_top_links(db: DbSession):
    return links_service.list_top_links(db)


@router.post("", response_model=LinkResponse, status_code=201)
def create_link(db: DbSession, user: OptionalUser, link: LinkCreate):
    return links_service.create_link(db, link, user)


@router.delete("/{link_id}", status_code=204)
def delete_link(db: DbSession, user: CurrentUser, link_id: int):
    links_service.delete_link(db, link_id, user)
