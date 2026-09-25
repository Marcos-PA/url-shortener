import uuid


# Valores únicos por teste: o test.db é recriado a cada execução, mas os testes compartilham o banco.
def _uid() -> str:
    return uuid.uuid4().hex[:8]


def test_livro_crud():
    with TestClient(app) as client:
        isbn = f"isbn-{_uid()}"
        created = client.post("/api/livros", json={"titulo": "Dom Casmurro", "isbn": isbn})
        assert created.status_code == 201
        livro = created.json()
        assert livro["ano"] is None
        assert any(x["id"] == livro["id"] for x in client.get("/api/livros").json())
        assert client.post("/api/livros", json={"titulo": "", "isbn": _uid()}).status_code == 422
        assert client.post("/api/livros", json={"titulo": "Outro", "isbn": isbn}).status_code == 409

        updated = client.patch(f"/api/livros/{livro['id']}", json={"ano": 1899})
        assert updated.status_code == 200 and updated.json()["ano"] == 1899

        assert client.delete(f"/api/livros/{livro['id']}").status_code == 204
        assert client.patch(f"/api/livros/{livro['id']}", json={"ano": 1}).status_code == 404


def test_membro_crud():
    with TestClient(app) as client:
        email = f"{_uid()}@x.com"
        created = client.post("/api/membros", json={"nome": "Ana", "email": email})
        assert created.status_code == 201
        membro_id = created.json()["id"]
        assert any(x["id"] == membro_id for x in client.get("/api/membros").json())
        assert client.post("/api/membros", json={"nome": "Ana", "email": "invalido"}).status_code == 422
        assert client.post("/api/membros", json={"nome": "Bia", "email": email}).status_code == 409

        updated = client.patch(f"/api/membros/{membro_id}", json={"nome": "Ana Maria"})
        assert updated.status_code == 200 and updated.json()["nome"] == "Ana Maria"

        assert client.delete(f"/api/membros/{membro_id}").status_code == 204
        assert client.delete(f"/api/membros/{membro_id}").status_code == 404


def test_emprestimo_crud():
    with TestClient(app) as client:
        livro_id = client.post("/api/livros", json={"titulo": "L", "isbn": _uid()}).json()["id"]
        membro_id = client.post("/api/membros", json={"nome": "M", "email": f"{_uid()}@x.com"}).json()["id"]
        body = {"livro_id": livro_id, "membro_id": membro_id, "data_prevista": "2026-12-31", "hora_retirada": "09:30"}

        created = client.post("/api/emprestimos", json=body)
        assert created.status_code == 201
        emp = created.json()
        assert emp["hora_retirada"] == "09:30:00" and emp["devolvido_em"] is None
        assert any(x["id"] == emp["id"] for x in client.get("/api/emprestimos").json())
        assert client.post("/api/emprestimos", json={**body, "data_prevista": "x"}).status_code == 422
        assert client.post("/api/emprestimos", json={**body, "livro_id": 999999}).status_code == 404
        assert client.post("/api/emprestimos", json={**body, "membro_id": 999999}).status_code == 404

        # alvo com filhos não pode ser excluído
        assert client.delete(f"/api/livros/{livro_id}").status_code == 409
        assert client.delete(f"/api/membros/{membro_id}").status_code == 409

        devolvido = client.post(f"/api/emprestimos/{emp['id']}/devolver")
        assert devolvido.status_code == 200 and devolvido.json()["devolvido_em"] is not None
        assert client.post(f"/api/emprestimos/{emp['id']}/devolver").status_code == 409

        assert client.delete(f"/api/emprestimos/{emp['id']}").status_code == 204
        assert client.delete(f"/api/emprestimos/{emp['id']}").status_code == 404
        assert client.post(f"/api/emprestimos/{emp['id']}/devolver").status_code == 404
