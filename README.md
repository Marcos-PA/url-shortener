# URL Shortener

Internal URL shortener (think bit.ly). Paste a long URL, get a short code; opening the short link
redirects (302) to the original URL and counts the click.

- App: https://url-shortener-dun-chi.vercel.app
- API: https://url-shortener-api-7pv8.onrender.com (docs at `/docs`)

Stack: React + Vite + TS + Tailwind + shadcn/ui · FastAPI + SQLAlchemy 2 + Alembic · Postgres (Supabase) ·
Playwright. Deployed on Vercel (front), Render (back) and Supabase (database).

## API

| Method | Path          | Description                                                           |
| ------ | ------------- | --------------------------------------------------------------------- |
| POST   | `/api/links`  | `{"url": "https://..."}` → 201 with `id`, `url`, `code`, `clicks`, `short_url`. Non-http(s) or malformed URL → 422. URL already shortened → 409. |
| GET    | `/api/links`  | All links, newest first, with click counts.                           |
| DELETE | `/api/links/{id}` | 204. The short link stops working. Unknown id → 404 `{"detail": "Link not found"}`. |
| GET    | `/{code}`     | 302 to the original URL and `clicks + 1`. Unknown code → 404 `{"detail": "Short code not found"}`. |
| GET    | `/api/health` | API and database status.                                              |

The redirect lives outside `/api` so short links stay short (`https://<api>/<code>`). They point to the
back end, not to Vercel: the front's SPA rewrite would send every path to `index.html`.

## How the click counter stays correct under concurrency

The redirect runs a single statement:

```sql
UPDATE links SET clicks = clicks + 1 WHERE code = :code RETURNING url
```

The increment happens inside the database, which takes a row lock for the update, so concurrent requests
are serialized per row and none are lost. A read-modify-write in Python (`link.clicks += 1`) would let two
requests read the same value and both write `n + 1`. The same statement also returns the target URL, so
there is one round trip and no window between "find" and "count".

Checked against the production Postgres: 50 parallel GETs to one short link → 50 × 302 and `clicks == 50`.

## How short codes are generated

7 random base62 characters from `secrets.choice` (62⁷ ≈ 3.5 trillion codes). Uniqueness is enforced by a
`UNIQUE` constraint on `code`: on a collision the insert raises `IntegrityError`, the service rolls back and
tries a new code (up to 5 times, then 503). There is no "check if it exists, then insert", which would race.

## Project structure

```
back/app/
  api/routes/link.py      POST/GET/DELETE /api/links (thin, calls the service)
  api/routes/redirect.py  GET /{code}
  services/links.py       code generation + retry, atomic click count
  schemas/link.py         Pydantic in/out (HttpUrl validation, computed short_url)
  models/link.py          SQLAlchemy model
back/migrations/          Alembic
front/src/pages/Links.tsx single page: form + table
```

## Running locally

Requirements: Python 3.13 + [uv](https://docs.astral.sh/uv/), Node 20+.

    cd back && cp .env.example .env && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
    cd front && npm install && npm run dev

Open http://localhost:5173. Dev uses SQLite (`back/app.db`), no Postgres needed; the Vite dev server proxies
`/api/*` to the back end on :8000. Short links point to `PUBLIC_BASE_URL` (`http://localhost:8000` in dev).

Environment variables (`back/.env`, and the Render dashboard in production):

| Variable          | Example                                             |
| ----------------- | --------------------------------------------------- |
| `DATABASE_URL`    | `sqlite:///./app.db` or the Supabase session pooler URL |
| `CORS_ORIGINS`    | `["http://localhost:5173"]`                         |
| `PUBLIC_BASE_URL` | `https://url-shortener-api-7pv8.onrender.com`       |

Front (Vercel): `VITE_API_URL` = `<API URL>/api`.

## Database migrations

    cd back
    uv run alembic revision --autogenerate -m "describe the change"
    uv run alembic upgrade head

Render runs `alembic upgrade head` before starting the server (see `render.yaml`).

## Tests

    cd back && uv run ruff check . && uv run pytest   # API: validation, code format/uniqueness, retry, redirect + count, 404
    npm install && npx playwright install            # first time, at the repo root
    npm run test:e2e                                 # E2E in Chromium, Firefox and WebKit

The E2E suite starts its own stack (back on :8001 with a throwaway SQLite, front on :5174) and covers:
shorten a URL → it appears in the table → open the short link → the click is counted.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: back (ruff + pytest), front
(lint + build) and E2E (Playwright, Chromium). Render is set to `autoDeployTrigger: checksPass`, so a commit
that breaks CI is never deployed to the API.

## Assumptions

- Each URL can be shortened only once: a second POST gets 409 (enforced by a unique index on `url`, so
  two simultaneous requests can't both get through).
- Codes are always random (no custom aliases).
- Links can be deleted (with a confirmation dialog) but not edited.
- URLs are stored as normalized by Pydantic's `HttpUrl` (e.g. `https://example.com` → `https://example.com/`).
- The pytest click test is sequential; the concurrency guarantee comes from the atomic `UPDATE` above and
  was checked manually against Postgres (SQLite in tests serializes writes anyway).
- No authentication: it is an internal tool.

## Gotchas

- Render's free tier sleeps after ~15 min idle; the first request takes ~1 min.
- Supabase's free tier pauses after ~1 week without use.
