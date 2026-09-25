from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.db.session import DbSession
from app.schemas.user import AuthResponse, UserCreate, UserResponse
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(db: DbSession, data: UserCreate):
    return users_service.register(db, data)


@router.post("/login", response_model=AuthResponse)
def login(db: DbSession, data: UserCreate):
    return users_service.login(db, data)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return user
