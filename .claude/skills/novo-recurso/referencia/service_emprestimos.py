from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.emprestimo import Emprestimo
from app.schemas.emprestimo import EmprestimoCreate
from app.services.livros import get_livro
from app.services.membros import get_membro


def create_emprestimo(db: Session, data: EmprestimoCreate) -> Emprestimo:
    get_livro(db, data.livro_id)
    get_membro(db, data.membro_id)
    emprestimo = Emprestimo(**data.model_dump())
    db.add(emprestimo)
    db.commit()
    db.refresh(emprestimo)
    return emprestimo


def list_emprestimos(db: Session) -> list[Emprestimo]:
    return list(db.scalars(select(Emprestimo).order_by(Emprestimo.id)))


def get_emprestimo(db: Session, emprestimo_id: int) -> Emprestimo:
    emprestimo = db.get(Emprestimo, emprestimo_id)
    if emprestimo is None:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return emprestimo


def devolver_emprestimo(db: Session, emprestimo_id: int) -> Emprestimo:
    emprestimo = get_emprestimo(db, emprestimo_id)
    if emprestimo.devolvido_em is not None:
        raise HTTPException(status_code=409, detail="Empréstimo já foi devolvido")
    # Render roda em UTC: sem o fuso, depois das 21h no Brasil gravaria o dia seguinte.
    emprestimo.devolvido_em = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    db.commit()
    db.refresh(emprestimo)
    return emprestimo


def delete_emprestimo(db: Session, emprestimo_id: int) -> None:
    db.delete(get_emprestimo(db, emprestimo_id))
    db.commit()
