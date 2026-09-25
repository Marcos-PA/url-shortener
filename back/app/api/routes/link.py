from fastapi import APIRouter

from app.db.session import DbSession
from app.schemas.link import LinkCreate, LinkResponse
from app.services import links as links_service

router = APIRouter(prefix="/links", tags=["links"])


@router.get("", response_model=list[LinkResponse])
def list_links(db: DbSession):
    return links_service.list_links(db)


@router.post("", response_model=LinkResponse, status_code=201)
def create_link(db: DbSession, link: LinkCreate):
    return links_service.create_link(db, link)
