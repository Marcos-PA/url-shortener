from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from app.db.session import DbSession
from app.services import links as links_service

# Outside the /api prefix: short links are https://<back>/<code>.
router = APIRouter(tags=["redirect"])


@router.get("/{code}")
def redirect(db: DbSession, code: str):
    return RedirectResponse(links_service.resolve_and_count(db, code), status_code=302)
