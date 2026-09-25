from datetime import date, time

from pydantic import BaseModel


class EmprestimoCreate(BaseModel):
    livro_id: int
    membro_id: int
    data_prevista: date
    hora_retirada: time | None = None


class EmprestimoResponse(BaseModel):
    id: int
    livro_id: int
    membro_id: int
    data_prevista: date
    hora_retirada: time | None
    devolvido_em: date | None
    model_config = {"from_attributes": True}
