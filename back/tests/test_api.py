import os
import uuid
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
    url = Settings(DATABASE_URL="postgres://u:p@h:5432/db", SECRET_KEY="x" * 32).DATABASE_URL
    assert url == "postgresql+psycopg://u:p@h:5432/db"



def test_link_create_and_list():
    with TestClient(app) as client:
        created = client.post("/api/links", json={"url": "https://example.com/some/long/path"})
        assert created.status_code == 201
        link = created.json()
        assert link["clicks"] == 0
        assert len(link["code"]) == 7 and link["code"].isalnum()
        # anonymous visitors have no list: their links live only in the page that created them
        assert client.get("/api/links").status_code == 401

        duplicate = client.post("/api/links", json={"url": "https://example.com/some/long/path"})
        assert duplicate.status_code == 409
        assert duplicate.json() == {"detail": "This URL has already been shortened"}

        other = client.post("/api/links", json={"url": "https://example.com/another/path"}).json()
        assert other["code"] != link["code"]

        for bad in ["ftp://x", "abc", ""]:
            assert client.post("/api/links", json={"url": bad}).status_code == 422


def test_redirect_counts_clicks():
    with TestClient(app) as client:
        _, auth = _register(client)
        link = client.post("/api/links", json={"url": "https://example.com/target"}, headers=auth).json()
        assert link["short_url"].endswith("/" + link["code"])

        for _ in range(3):
            r = client.get(f"/{link['code']}", follow_redirects=False)
            assert r.status_code == 302
            assert r.headers["location"] == "https://example.com/target"

        listed = next(x for x in client.get("/api/links", headers=auth).json() if x["id"] == link["id"])
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


def test_delete_link():
    with TestClient(app) as client:
        _, auth = _register(client)
        link = client.post("/api/links", json={"url": "https://example.com/delete-me"}, headers=auth).json()
        assert client.delete(f"/api/links/{link['id']}").status_code == 401  # deleting needs a login
        assert client.delete(f"/api/links/{link['id']}", headers=auth).status_code == 204
        assert all(x["id"] != link["id"] for x in client.get("/api/links", headers=auth).json())
        assert client.get(f"/{link['code']}", follow_redirects=False).status_code == 404
        missing = client.delete(f"/api/links/{link['id']}", headers=auth)
        assert missing.status_code == 404 and missing.json() == {"detail": "Link not found"}


def test_duplicate_url_race_hits_unique_constraint(monkeypatch):
    from app.services import links as links_service

    with TestClient(app) as client:
        client.post("/api/links", json={"url": "https://example.com/race"})
        real_check = links_service._ensure_url_is_new
        calls = []

        # First check misses the existing row, as if another request inserted it right after.
        def racy_check(db, url, owner):
            calls.append(url)
            if len(calls) > 1:
                real_check(db, url, owner)

        monkeypatch.setattr(links_service, "_ensure_url_is_new", racy_check)
        assert client.post("/api/links", json={"url": "https://example.com/race"}).status_code == 409


def test_personal_link():
    with TestClient(app) as client:
        created = client.post("/api/links", json={"url": "https://example.com/promo", "personal_link": "my-promo"})
        assert created.status_code == 201
        assert created.json()["code"] == "my-promo"
        assert created.json()["short_url"].endswith("/my-promo")
        r = client.get("/my-promo", follow_redirects=False)
        assert r.status_code == 302 and r.headers["location"] == "https://example.com/promo"

        taken = client.post("/api/links", json={"url": "https://example.com/other", "personal_link": "my-promo"})
        assert taken.status_code == 409 and taken.json() == {"detail": "This personal link is already taken"}

        for bad in ["ab", "has space", "a/b", "x" * 17, "docs", "API"]:
            body = {"url": "https://example.com/bad", "personal_link": bad}
            assert client.post("/api/links", json=body).status_code == 422, bad

        # empty/None falls back to a random code
        random = client.post("/api/links", json={"url": "https://example.com/rand", "personal_link": None})
        assert random.status_code == 201 and len(random.json()["code"]) == 7



def test_production_requires_secret_key():
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(DATABASE_URL="postgres://u:p@h:5432/db", SECRET_KEY="dev-only-secret-change-me")


def _register(client, email=None, password="s3cret-pass"):
    email = email or f"{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201, r.text
    return email, {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_register_login_me():
    with TestClient(app) as client:
        email, auth = _register(client)
        assert client.get("/api/auth/me", headers=auth).json()["email"] == email

        dup = client.post("/api/auth/register", json={"email": email.upper(), "password": "another-pass"})
        assert dup.status_code == 409 and dup.json() == {"detail": "E-mail already registered"}
        assert client.post("/api/auth/register", json={"email": "bad", "password": "s3cret-pass"}).status_code == 422
        assert client.post("/api/auth/register", json={"email": "a@b.co", "password": "short"}).status_code == 422

        ok = client.post("/api/auth/login", json={"email": email, "password": "s3cret-pass"})
        assert ok.status_code == 200 and ok.json()["user"]["email"] == email
        wrong = client.post("/api/auth/login", json={"email": email, "password": "wrong-pass"})
        assert wrong.status_code == 401 and wrong.json() == {"detail": "Invalid e-mail or password"}
        unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "s3cret-pass"})
        assert unknown.status_code == 401

        assert client.get("/api/auth/me").status_code == 401
        bad = client.get("/api/links", headers={"Authorization": "Bearer 1.9999999999.forged"})
        assert bad.status_code == 401


def test_expired_token_is_rejected(monkeypatch):
    from app.core import security

    with TestClient(app) as client:
        _, auth = _register(client)
        monkeypatch.setattr(security.time, "time", lambda: 10**12)
        assert client.get("/api/auth/me", headers=auth).status_code == 401


def test_links_are_scoped_to_their_owner():
    with TestClient(app) as client:
        _, alice = _register(client)
        _, bob = _register(client)
        url = f"https://example.com/owned/{uuid.uuid4().hex}"

        mine = client.post("/api/links", json={"url": url}, headers=alice)
        assert mine.status_code == 201
        # same URL: 409 for the same owner, fine for someone else and for anonymous
        assert client.post("/api/links", json={"url": url}, headers=alice).status_code == 409
        assert client.post("/api/links", json={"url": url}, headers=bob).status_code == 201
        assert client.post("/api/links", json={"url": url}).status_code == 201
        assert client.post("/api/links", json={"url": url}).status_code == 409

        alice_ids = [x["id"] for x in client.get("/api/links", headers=alice).json()]
        assert alice_ids == [mine.json()["id"]]
        assert mine.json()["id"] not in [x["id"] for x in client.get("/api/links", headers=bob).json()]

        # anyone can follow a short link, only the owner can delete it
        assert client.get(f"/{mine.json()['code']}", follow_redirects=False).status_code == 302
        assert client.delete(f"/api/links/{mine.json()['id']}", headers=bob).status_code == 404
        assert client.delete(f"/api/links/{mine.json()['id']}").status_code == 401
        assert client.delete(f"/api/links/{mine.json()['id']}", headers=alice).status_code == 204


def test_top_links_are_public_and_ranked():
    with TestClient(app) as client:
        _, alice = _register(client)
        tag = uuid.uuid4().hex[:8]
        popular = client.post("/api/links", json={"url": f"https://example.com/top/{tag}/a"}, headers=alice).json()
        second = client.post("/api/links", json={"url": f"https://example.com/top/{tag}/b"}).json()
        never = client.post("/api/links", json={"url": f"https://example.com/top/{tag}/c"}).json()
        for _ in range(6):  # other tests click a link at most 3 times
            client.get(f"/{popular['code']}", follow_redirects=False)
        for _ in range(5):
            client.get(f"/{second['code']}", follow_redirects=False)

        top = client.get("/api/links/top").json()  # anonymous, yet includes alice's link
        assert [x["code"] for x in top[:2]] == [popular["code"], second["code"]]
        assert top[0] == {
            "url": popular["url"], "code": popular["code"], "clicks": 6, "short_url": popular["short_url"],
        }
        assert never["code"] not in [x["code"] for x in top]
        assert len(top) <= 10


def _age_link(link_id: int, hours: float) -> None:
    """Pretend a link was created `hours` ago."""
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.db.session import SessionLocal
    from app.models.link import Link

    with SessionLocal() as db:
        created = datetime.now(UTC) - timedelta(hours=hours)
        db.execute(update(Link).where(Link.id == link_id).values(created_at=created))
        db.commit()


def test_anonymous_links_expire_after_two_hours():
    with TestClient(app) as client:
        _, auth = _register(client)
        tag = uuid.uuid4().hex[:8]
        old_anon = client.post("/api/links", json={"url": f"https://example.com/exp/{tag}"}).json()
        fresh_anon = client.post("/api/links", json={"url": f"https://example.com/exp/{tag}/fresh"}).json()
        old_owned = client.post("/api/links", json={"url": f"https://example.com/exp/{tag}"}, headers=auth).json()
        for link in (old_anon, fresh_anon, old_owned):
            assert client.get(f"/{link['code']}", follow_redirects=False).status_code == 302
        _age_link(old_anon["id"], 2.1)
        _age_link(fresh_anon["id"], 1.9)
        _age_link(old_owned["id"], 48)

        # expired: no redirect and out of the ranking, even before the purge runs
        assert client.get(f"/{old_anon['code']}", follow_redirects=False).status_code == 404
        top_codes = [x["code"] for x in client.get("/api/links/top").json()]
        assert old_anon["code"] not in top_codes
        assert client.get(f"/{fresh_anon['code']}", follow_redirects=False).status_code == 302
        assert client.get(f"/{old_owned['code']}", follow_redirects=False).status_code == 302

        # creating a link purges expired anonymous ones, which frees their URL for anonymous users again
        again = client.post("/api/links", json={"url": f"https://example.com/exp/{tag}"})
        assert again.status_code == 201 and again.json()["code"] != old_anon["code"]
        assert client.get(f"/{fresh_anon['code']}", follow_redirects=False).status_code == 302
        owned = client.get("/api/links", headers=auth).json()
        assert [x["id"] for x in owned] == [old_owned["id"]]
