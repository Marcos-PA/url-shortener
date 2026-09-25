from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "API"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./app.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    # Where short links point to (the back, not the Vercel front).
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # Supabase/Render entregam "postgresql://" ou "postgres://"; SQLAlchemy precisa do driver psycopg 3.
    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg(cls, url: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url


settings = Settings()
