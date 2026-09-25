# fullstack-template

React + Vite + TS + Tailwind + shadcn/ui · FastAPI + SQLAlchemy · Postgres (Supabase) · Playwright.
Deploy grátis: Vercel (front) + Render (back) + Supabase (banco).

## Rodando em dev

    cd back && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload
    cd front && npm install && npm run dev

Dev usa SQLite (`back/app.db`), sem precisar de Postgres. O front chama `/api/*` e o Vite repassa ao back.

## Testes

    cd back && uv run ruff check . && uv run pytest     # API
    npm install && npx playwright install               # 1ª vez, na raiz
    npm run test:e2e                                    # E2E em Chromium, Firefox e WebKit

O E2E sobe sua própria stack (back :8001 com SQLite descartável, front :5174): não mexe no
banco de dev nem no Supabase, e pode rodar com o dev ligado. Relatório: `npx playwright show-report`.

## Criando um recurso novo (Claude Code)

    /novo-recurso produto nome:str preco:float categoria:enum(alimento|limpeza) ativo:bool

Gera model, schema, service, rota e teste no back, e tipo, service e página (shadcn) no front,
seguindo o `CLAUDE.md`. Tipos: `str text int float bool date time datetime email enum(a|b) fk:<alvo>`;
`campo?` opcional, `campo!` único, `campo=` preenchido pelo back, `sem:editar,excluir` para registros
que não mudam depois de criados. Detalhes e código de referência em `.claude/skills/novo-recurso/`.

## Front: UI

Componentes [shadcn/ui](https://ui.shadcn.com) em `front/src/components/ui` (já instalados: button, card,
input, input-group, field, checkbox, select, dialog, alert-dialog, table, tabs, dropdown-menu, calendar,
popover, pagination, badge, alert, skeleton, empty, sonner, spinner, toggle-group...).
Faltou um: `cd front && npx shadcn@latest add <nome>`.
Erros da API viram toast com a mensagem do back: `toast.error(getErrorMessage(err, "fallback"))`.

## Deploy (primeira vez, ~15 min)

1. **GitHub**: crie o repo e dê push. (Settings → marque "Template repository" para reusar.)
2. **Supabase**: New project (região perto de você). Botão **Connect** → copie a URL do
   **Session pooler** (porta 5432). Não use a "Direct connection": ela é só IPv6 e o Render não conecta.
   Senha com caracteres especiais (`@`, `#`, `/`...) precisa estar URL-encoded.
3. **Render**: New → Blueprint → escolha o repo (ele lê o `render.yaml`).
   - `DATABASE_URL` = URL do Supabase.
   - `CORS_ORIGINS` = `["http://localhost:5173"]` por enquanto.
   - Teste: `https://<seu-app>.onrender.com/api/health` → `{"status":"ok","database":"ok"}`.
4. **Vercel**: Add New → Project → repo → **Root Directory = `front`**.
   - Env var `VITE_API_URL` = `https://<seu-app>.onrender.com/api`.
5. **Volte ao Render** e troque `CORS_ORIGINS` para `["https://<seu-app>.vercel.app"]`
   (sem barra no final). Ele reinicia sozinho.
6. Abra a URL da Vercel → Home mostra "API: ok · Banco: ok" → /tasks salva e lista.

Depois disso: `git push` na main = deploy automático dos dois.

## Pegadinhas

- **Render free dorme após ~15 min.** A 1ª requisição leva ~1 min. Abra `/api/health` antes de apresentar.
- **Supabase free pausa após ~1 semana sem uso.** Reative no painel antes do dia do projeto.
- Mudou `VITE_API_URL` na Vercel? Precisa **Redeploy** (é lida no build).
- Erro de CORS no console do navegador = `CORS_ORIGINS` no Render não bate exatamente com a URL da Vercel.
- Mudou colunas de um model que já existe → apague a tabela no Supabase e reinicie o back (`create_all` não altera tabelas).
