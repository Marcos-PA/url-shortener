from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.emprestimo import Emprestimo
from app.models.livro import Livro
from app.schemas.livro import LivroCreate, LivroUpdate


def _check_isbn(db: Session, isbn: str, livro_id: int | None = None) -> None:
    existing = db.scalar(select(Livro).where(Livro.isbn == isbn))
    if existing is not None and existing.id != livro_id:
        raise HTTPException(status_code=409, detail="ISBN já cadastrado")


def create_livro(db: Session, data: LivroCreate) -> Livro:
    _check_isbn(db, data.isbn)
    livro = Livro(**data.model_dump())
    db.add(livro)
    db.commit()
    db.refresh(livro)
    return livro


def list_livros(db: Session) -> list[Livro]:
    return list(db.scalars(select(Livro).order_by(Livro.id)))


def get_livro(db: Session, livro_id: int) -> Livro:
    livro = db.get(Livro, livro_id)
    if livro is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro


def update_livro(db: Session, livro_id: int, data: LivroUpdate) -> Livro:
    livro = get_livro(db, livro_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("isbn") is not None:
        _check_isbn(db, changes["isbn"], livro_id)
    for field, value in changes.items():
        setattr(livro, field, value)
    db.commit()
    db.refresh(livro)
    return livro


def delete_livro(db: Session, livro_id: int) -> None:
    livro = get_livro(db, livro_id)
    if db.scalar(select(func.count()).where(Emprestimo.livro_id == livro_id)):
        raise HTTPException(status_code=409, detail="Livro possui empréstimos e não pode ser excluído")
    db.delete(livro)
    db.commit()
