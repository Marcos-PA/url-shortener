from pydantic import BaseModel, Field


class LivroCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    isbn: str = Field(min_length=1, max_length=200)
    ano: int | None = None


class LivroResponse(BaseModel):
    id: int
    titulo: str
    isbn: str
    ano: int | None
    model_config = {"from_attributes": True}


class LivroUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    isbn: str | None = Field(default=None, min_length=1, max_length=200)
    ano: int | None = None
