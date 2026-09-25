import os
from pathlib import Path

# Banco novo a cada execução: senão um teste de campo único (2º POST = 409) falha na 2ª rodada.
Path("test.db").unlink(missing_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


def test_health_and_tasks():
    with TestClient(app) as client:  # "with" roda o lifespan (cria as tabelas)
        assert client.get("/api/health").json() == {"status": "ok", "database": "ok"}
        created = client.post("/api/tasks", json={"title": "teste"})
        assert created.status_code == 201
        assert created.json()["title"] == "teste"
        assert any(t["title"] == "teste" for t in client.get("/api/tasks").json())
        assert client.post("/api/tasks", json={"title": ""}).status_code == 422


def test_supabase_url_uses_psycopg():
    url = Settings(DATABASE_URL="postgres://u:p@h:5432/db").DATABASE_URL
    assert url == "postgresql+psycopg://u:p@h:5432/db"


def test_update_and_delete_task():
    with TestClient(app) as client:
        task_id = client.post("/api/tasks", json={"title": "editar"}).json()["id"]

        updated = client.patch(f"/api/tasks/{task_id}", json={"done": True})
        assert updated.status_code == 200
        assert updated.json() == {"id": task_id, "title": "editar", "done": True}
        assert client.patch(f"/api/tasks/{task_id}", json={"title": ""}).status_code == 422

        assert client.delete(f"/api/tasks/{task_id}").status_code == 204
        assert client.delete(f"/api/tasks/{task_id}").status_code == 404
        assert client.patch(f"/api/tasks/{task_id}", json={"done": True}).status_code == 404


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
