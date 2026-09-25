from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import AuthResponse, UserCreate, UserResponse


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_token(user.id), user=UserResponse.model_validate(user))


def register(db: Session, data: UserCreate) -> AuthResponse:
    if db.scalar(select(User.id).where(User.email == data.email)) is not None:
        raise HTTPException(status_code=409, detail="E-mail already registered")
    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # same e-mail registered at the same moment
        db.rollback()
        raise HTTPException(status_code=409, detail="E-mail already registered") from None
    db.refresh(user)
    return _auth_response(user)


def login(db: Session, data: UserCreate) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == data.email))
    # Same message for unknown e-mail and wrong password: don't reveal which e-mails exist.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid e-mail or password")
    return _auth_response(user)
