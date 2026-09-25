from pydantic import BaseModel, Field, HttpUrl


class LinkCreate(BaseModel):
    url: HttpUrl = Field(max_length=2048)


class LinkResponse(BaseModel):
    id: int
    url: str
    code: str
    clicks: int
    model_config = {"from_attributes": True}
