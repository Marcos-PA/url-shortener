import os
from pathlib import Path

# Banco novo a cada execução: senão um teste de campo único (2º POST = 409) falha na 2ª rodada.
Path("test.db").unlink(missing_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.session import engine
from app.main import app
from app.models import Base

Base.metadata.create_all(engine)


def test_health():
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok", "database": "ok"}


def test_supabase_url_uses_psycopg():
    url = Settings(DATABASE_URL="postgres://u:p@h:5432/db").DATABASE_URL
    assert url == "postgresql+psycopg://u:p@h:5432/db"



def test_link_create_and_list():
    with TestClient(app) as client:
        created = client.post("/api/links", json={"url": "https://example.com/some/long/path"})
        assert created.status_code == 201
        link = created.json()
        assert link["clicks"] == 0
        assert len(link["code"]) == 7 and link["code"].isalnum()
        assert any(x["id"] == link["id"] for x in client.get("/api/links").json())

        other = client.post("/api/links", json={"url": "https://example.com/some/long/path"}).json()
        assert other["code"] != link["code"]

        for bad in ["ftp://x", "abc", ""]:
            assert client.post("/api/links", json={"url": bad}).status_code == 422


def test_redirect_counts_clicks():
    with TestClient(app) as client:
        link = client.post("/api/links", json={"url": "https://example.com/target"}).json()
        assert link["short_url"].endswith("/" + link["code"])

        for _ in range(3):
            r = client.get(f"/{link['code']}", follow_redirects=False)
            assert r.status_code == 302
            assert r.headers["location"] == "https://example.com/target"

        listed = next(x for x in client.get("/api/links").json() if x["id"] == link["id"])
        assert listed["clicks"] == 3

        missing = client.get("/nope123", follow_redirects=False)
        assert missing.status_code == 404
        assert missing.json() == {"detail": "Short code not found"}


def test_code_collision_retries(monkeypatch):
    from app.services import links as links_service

    with TestClient(app) as client:
        taken = client.post("/api/links", json={"url": "https://example.com/a"}).json()["code"]
        codes = iter([taken, taken, "Fresh01"])
        monkeypatch.setattr(links_service, "generate_code", lambda: next(codes))
        created = client.post("/api/links", json={"url": "https://example.com/b"})
        assert created.status_code == 201 and created.json()["code"] == "Fresh01"

        monkeypatch.setattr(links_service, "generate_code", lambda: taken)
        assert client.post("/api/links", json={"url": "https://example.com/c"}).status_code == 503
