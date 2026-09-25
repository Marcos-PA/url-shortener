from pydantic import BaseModel, Field, HttpUrl, computed_field, field_validator

from app.core.config import settings

# Paths the app already serves at the root, so they can't be short codes.
RESERVED_CODES = {"api", "docs", "redoc"}


class LinkCreate(BaseModel):
    url: HttpUrl = Field(max_length=2048)
    # Custom short code chosen by the user; random when empty.
    personal_link: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{3,16}$")

    @field_validator("personal_link")
    @classmethod
    def not_reserved(cls, value: str | None) -> str | None:
        if value is not None and value.lower() in RESERVED_CODES:
            raise ValueError(f'"{value}" is reserved, choose another one')
        return value


# Public view of a link: no id and no owner (used by the top-10 ranking).
class LinkPublic(BaseModel):
    url: str
    code: str
    clicks: int
    model_config = {"from_attributes": True}

    @computed_field
    @property
    def short_url(self) -> str:
        return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/{self.code}"


class LinkResponse(LinkPublic):
    id: int
