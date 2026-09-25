from pydantic import BaseModel, Field, HttpUrl, computed_field

from app.core.config import settings


class LinkCreate(BaseModel):
    url: HttpUrl = Field(max_length=2048)


class LinkResponse(BaseModel):
    id: int
    url: str
    code: str
    clicks: int
    model_config = {"from_attributes": True}

    @computed_field
    @property
    def short_url(self) -> str:
        return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/{self.code}"
