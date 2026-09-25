from fastapi import APIRouter

from app.db.session import DbSession
from app.schemas.emprestimo import EmprestimoCreate, EmprestimoResponse
from app.services import emprestimos as emprestimos_service

router = APIRouter(prefix="/emprestimos", tags=["emprestimos"])


@router.get("", response_model=list[EmprestimoResponse])
def list_emprestimos(db: DbSession):
    return emprestimos_service.list_emprestimos(db)


@router.post("", response_model=EmprestimoResponse, status_code=201)
def create_emprestimo(db: DbSession, emprestimo: EmprestimoCreate):
    return emprestimos_service.create_emprestimo(db, emprestimo)


@router.post("/{emprestimo_id}/devolver", response_model=EmprestimoResponse)
def devolver_emprestimo(db: DbSession, emprestimo_id: int):
    return emprestimos_service.devolver_emprestimo(db, emprestimo_id)


@router.delete("/{emprestimo_id}", status_code=204)
def delete_emprestimo(db: DbSession, emprestimo_id: int):
    emprestimos_service.delete_emprestimo(db, emprestimo_id)
