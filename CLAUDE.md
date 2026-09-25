# Convenções do projeto

Stack: React + Vite + TS + Tailwind (front/) · FastAPI + SQLAlchemy 2 (back/) · Postgres no Supabase.
Deploy: front na Vercel, back no Render (render.yaml). Cada `git push` na main faz deploy.

## Prioridade (projeto de 2h)
- Funcionalidade que o enunciado pede > código bonito. Sem auth, testes extras ou libs novas se não forem pedidos.
- Faça commit e push a cada feature funcionando, para testar na URL pública cedo.
- Novo CRUD (entidade/cadastro): use a skill `/new-resource <nome> <campo:tipo>...`. Task é o exemplo de referência.

## Back (back/, FastAPI + uv)
- Dependências: sempre `uv add <pacote>` (dev: `uv add --dev`). Nunca pip. Commitar o `uv.lock`.
- Nova rota: `app/api/routes/<recurso>.py` com um `APIRouter`, registrado em `app/api/router.py`.
  Todas as rotas ficam sob o prefixo `/api`.
- Banco na rota: parâmetro `db: DbSession` (de `app.db.session`).
- Model SQLAlchemy: `app/models/<recurso>.py`, herdando `Base`; importar em `app/models/__init__.py`
  (senão a tabela não é criada).
- Schema via Alembic: mudou/criou model → `uv run alembic revision --autogenerate -m "..."` e
  `uv run alembic upgrade head`. O Render roda `upgrade head` no start. Pytest cria as tabelas com `create_all`.
- Schemas Pydantic (entrada/saída): `app/schemas/<recurso>.py`. Nunca retornar model direto.
- Regra de negócio: `app/services/<recurso>.py`. Rotas ficam finas.
- Config/segredos: `app/core/config.py` + `.env`. Nada hardcoded. Nova variável → adicionar também
  no painel do Render.
- `.env.example` vai para o GitHub: só placeholders, NUNCA senha ou URL real do banco. Valores reais
  ficam no `.env` (ignorado pelo git) e no painel do Render.
- Antes de concluir: `uv run ruff check . && uv run pytest`.

## Front (front/, React + Vite + TS + Tailwind)
- Estilo só com classes Tailwind. Sem arquivos .css novos.
- UI com componentes shadcn/ui (`@/components/ui`). Falta um? `npx shadcn@latest add <nome>`, não criar na mão.
  Cores semânticas (`bg-primary`, `text-muted-foreground`), nunca cores cruas.
- Chamadas HTTP só via `src/services/` usando a instância `api` de `services/api.ts`.
  Caminhos relativos (`/tasks`), nunca URL completa.
- Erros de API: `toast.error(getErrorMessage(err, "mensagem padrão"))` (de `services/api.ts`), que
  mostra o `detail` do FastAPI (404, 422).
- Tipos das respostas da API em `src/types/`, espelhando os schemas do back.
- Páginas em `src/pages/` (registradas em `App.tsx`), componentes reutilizáveis em `src/components/`,
  hooks em `src/hooks/`, layouts em `src/layouts/`.
- Antes de concluir: `npm run build` (a Vercel falha no deploy se o build falhar).

## Testes E2E (Playwright, na raiz)
- `npm run test:e2e` sobe back (:8001, SQLite `back/e2e.db` recriado a cada execução) e front (:5174)
  isolados. Não toca no banco de dev nem no Supabase.
- Testes em `tests/app.spec.ts`. Linhas de lista: `page.getByRole("main").getByRole("listitem")`
  (toasts do sonner também são `<li>`).
- Rápido durante o desenvolvimento: `npx playwright test --project=chromium`.
