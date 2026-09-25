from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_KEY = "dev-only-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "API"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./app.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    # Where short links point to (the back, not the Vercel front).
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    # Signs login tokens. Anyone with it can log in as any user: set a long random value in production.
    SECRET_KEY: str = DEV_SECRET_KEY
    TOKEN_TTL_DAYS: int = 7

    # Supabase/Render entregam "postgresql://" ou "postgres://"; SQLAlchemy precisa do driver psycopg 3.
    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg(cls, url: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url

    @model_validator(mode="after")
    def require_secret_outside_sqlite(self) -> "Settings":
        if not self.DATABASE_URL.startswith("sqlite") and self.SECRET_KEY == DEV_SECRET_KEY:
            raise ValueError("SECRET_KEY must be set when using a real database")
        return self


settings = Settings()
