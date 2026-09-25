---
name: new-resource
description: Creates a complete CRUD resource (model, schema, service, route and test in the back; type, service and shadcn page in the front) following the project's conventions. Use when asked for a "new resource", "new CRUD", "new entity", "X registration", "novo recurso", "cadastro de X" or /new-resource.
argument-hint: <name> <field:type>... [no:edit,delete]  e.g.: livro titulo:str isbn!:str ano?:int  ·  emprestimo livro_id:fk:livro emprestado_em=:date devolvido_em?=:date no:edit
---

# New CRUD resource

Request: `$ARGUMENTS`

References, in this order:
- **Task** (`back/app/**/task*.py`, `front/src/pages/Tasks.tsx`): file structure, names, thin
  routes, service with 404. Tasks.tsx is a single-field list: don't use its layout for resources
  with a form.
- **`reference/`** (in this skill's folder), code from a real project that passed ruff, pytest,
  build and E2E. Use it as a template, swapping names and fields:
  - `Livros.tsx`: page with `Table`, create/edit `Dialog`, delete `AlertDialog`, optional numeric
    field. `service_livros.py` / `schema_livro.py`: unique field (`!`) checked on create and on
    update, 409 when deleting a target that has children.
  - `Emprestimos.tsx`: `fk` `Select`, `Calendar`, `time`, row action, `no:edit` (create-only
    dialog). `service_emprestimos.py` / `schema_emprestimo.py` / `route_emprestimo.py`: `fk` 404,
    `/devolver` action, today's date with timezone, back-filled fields outside Create.
  - `test_api_trecho.py` (pytest) and `e2e_emprestimo.spec.ts` (Playwright).

Names: `<resource>` singular in snake_case (`produto`), class in PascalCase (`Produto`),
table and URL plural (`produtos`, `/produtos`), functions `create_<resource>`, `list_<resources>`,
`get_<resource>`, `update_<resource>`, `delete_<resource>`. Identifiers without accents; **all text
the user sees in Portuguese with correct accents and spelling** ("Empréstimo", "E-mail já
cadastrado", "ISBN").

Missing name or fields? Ask once, with an example of the format. Don't guess fields.

## Syntax

`<field><modifiers>:<type>`. Modifiers (can be combined, e.g.: `devolvido_em?=:date`):

- `?` **optional**: can be empty.
- `!` **unique**: `unique=True` on the model **and** a check in the service on create **and** on
  update (ignoring its own id), with `409 "<Campo> já cadastrado"`, because the database's
  `IntegrityError` becomes a 500. Test: the 2nd identical POST returns 409.
- `=` **filled by the back**: today's date, logged-in user, something an action records. It stays
  **out of Create, Update and the form**; it goes into Response. The service sets the value. With
  `?=`, the field starts empty and an action fills it later (`devolvido_em?=:date` + `/devolver`).

`no:edit` / `no:delete` / `no:edit,delete` (at the end) doesn't generate PATCH and/or DELETE: no
route, service, `<R>Update`, front function, button or test line. With `no:edit`, the `Dialog` is
create-only (fixed title "Novo ...", no `editando` state). Use it for records that don't change
after creation (order that reduced stock, loan, appointment): editing or deleting would require
undoing effects, and it's cheaper not to offer it.

FK: the field is named `<target>_id` and the type is `fk:<target>`: `livro_id:fk:livro`. On screen,
show the target's name, not the id.

## Field types

| Request     | SQLAlchemy (`Mapped[...]`)                         | Pydantic                  | TypeScript | shadcn control                     |
| ----------- | -------------------------------------------------- | ------------------------- | ---------- | ---------------------------------- |
| `str`       | `str` + `String(200)`                              | `str = Field(min_length=1, max_length=200)` | `string` | `Input`                  |
| `text`      | `str` + `Text`                                     | `str`                     | `string`   | `Textarea`                         |
| `int`       | `int`                                              | `int`                     | `number`   | `Input type="number"`              |
| `float`     | `float`                                            | `float`                   | `number`   | `Input type="number" step="0.01"`  |
| `bool`      | `bool` + `Boolean, default=False`                  | `bool = False`            | `boolean`  | `Checkbox` (form) / `Switch`       |
| `date`      | `date` + `Date`                                    | `date`                    | `string` (`YYYY-MM-DD`) | `Popover` + `Calendar` |
| `time`      | `time` + `Time`                                    | `time`                    | `string` (`HH:MM:SS`) | `Input type="time"`       |
| `datetime`  | `datetime` + `DateTime`                            | `datetime`                | `string` (ISO) | read-only on screen (see note)  |
| `email`     | `str` + `String(200)`                              | `str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")` | `string` | `Input type="email"` |
| `enum(a\|b)` | `str` + `String(20)`                               | `Literal["a", "b"]`       | `"a" \| "b"` | `Select` (or `ToggleGroup` if ≤ 5) |
| `fk:<target>` | `int` + `ForeignKey("<targets>.id")`             | `int`                     | `number`   | `Select` with the target's items   |

- `enum` without values (`categoria:enum`)? Ask for the values. Define the `Literal` once in the
  schema (`Categoria = Literal[...]`) and reuse it in Create/Update/Response; in the front, a
  `Record<Categoria, string>` with the labels feeds the `Select` and the table. Values without `:`
  (`09h30`), because `:` separates field and type.
- Money: use `float`. `Decimal` becomes a **string** in Pydantic v2 JSON and complicates the front.
- **Today's date in the back:** `datetime.now(ZoneInfo("America/Sao_Paulo")).date()`, never
  `date.today()`. Render runs in UTC (after 9pm in Brazil it would record the next day) and ruff
  rejects `date.today()` (DTZ011).
- `date` in the front: **never** `new Date("2026-12-31")` (it's UTC and shows the previous day in
  Brazil). Use `parseISO(s)` to read and `format(d, "yyyy-MM-dd")` to send (`date-fns`, already
  installed). Display: `format(parseISO(s), "dd/MM/yyyy")`. Calendar:
  `<Calendar mode="single" locale={ptBR} ... />` with `import { ptBR } from "react-day-picker/locale"`.
- `time`: Pydantic serializes `"09:30:00"`; `<input type="time">` returns `"09:30"`, and Pydantic
  accepts both. Display with `hora.slice(0, 5)`.
- `datetime`: for a **back-end timestamp** (`criado_em=:datetime`), not for the user to pick.
  Scheduling with date and time? Two fields `data:date hora:time`: the conflict rule becomes an
  equality comparison and there's no timezone in the way. Display: `format(parseISO(s), "dd/MM/yyyy HH:mm")`.
- `email`: `pattern`, because `EmailStr` requires the `email-validator` lib (CLAUDE.md: no new libs
  unless asked). Test: invalid email returns 422.
- Optional (`?`): `Mapped[X | None]` with `nullable=True`, Pydantic `X | None = None` (also in
  Create), TS `x: X | null`. In the form it's not `required`, and empty becomes `null`, not `0`/`""`:
  number `Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber` with
  `value={form.x ?? ""}`; text and time `e.target.value || null`. In the table show `—`.
- `fk`: dev SQLite doesn't enforce the FK. In `create_`/`update_`, call the target service's
  `get_<target>` (404 `"<Alvo> não encontrado"`).
- `fk`, **target** side: deleting a target that still has children passes on SQLite and returns a
  **500** on production Postgres. In the target's `delete_`, count the children and raise
  `409 "<Alvo> possui <filhos> e não pode ser excluído"`, with a test. It's an edit to the resource
  that already exists; do it in the same step.

## Back (`back/`)

1. `app/models/<resource>.py`: class inheriting `Base` (like `models/task.py`).
   **Import it in `app/models/__init__.py`**, otherwise the table isn't created.
2. `app/schemas/<resource>.py`: `<R>Create` (without the `=` fields), `<R>Update` (all optional with
   `default=None`, without the `=` ones; doesn't exist with `no:edit`) and `<R>Response` with
   `model_config = {"from_attributes": True}`.
3. `app/services/<resources>.py`: the functions from "Names" above, like `services/tasks.py`. With
   several fields, `create_` uses `Model(**data.model_dump())` and sets the `=` ones afterwards.
4. `app/api/routes/<resource>.py`: `APIRouter(prefix="/<resources>", tags=["<resources>"])` with
   GET list, POST (201), PATCH `/{id}` and DELETE `/{id}` (204), minus what `no:` removed. Thin
   routes: they only call the service. GET `/{id}` only if some screen uses it.
5. Register in `app/api/router.py`.
6. `tests/test_api.py`: `test_<resource>_crud` covering create (201), list, validation 422,
   update, delete (204) and 404 after delete, minus what `no:` removed; plus the lines for `!`
   (409), for `fk` (404 on missing target, 409 when deleting a target with children) and for each
   action. Template: `reference/test_api_trecho.py`.

**Action beyond CRUD** (return, cancel, approve, complete): don't use PATCH. Create
`POST /<resources>/{id}/<action>` with a service function that validates the state (`409 "Empréstimo
já foi devolvido"`), records the field and returns the Response. Fixed routes (`/atrasados`) come
**before** `/{id}` in the router. Front: icon button on the row with `aria-label`
`"<Ação> \"<nome>\""`, visible only when the action is possible, and `toast.success` when done.
Template: `Emprestimos.tsx`.

**Child item without its own screen** (order item with product and quantity): it's not a
`/new-resource`. It's a model + nested schema of the parent: `PedidoCreate` receives
`itens: list[ItemCreate] = Field(min_length=1)`, the parent's service creates parent and items in a
single `commit` (all or nothing), and the parent's Response returns the items. A standalone items
CRUD would let someone change the quantity without going through the parent's rule.

Changed columns of a model **already created** in Supabase? `create_all` doesn't alter tables: tell
the user to drop the table in the Table Editor and restart the back.

## Front (`front/src/`)

7. `types/<resource>.ts`: interface mirroring `<R>Response`, and `<R>Input` = `Omit<R, "id" | <= fields>>`.
8. `services/<resource>Service.ts`: `list`, `create`, `update`, `delete` (minus the `no:`) and one
   function per action, using `api` and relative paths (`/<resources>`). Template:
   `reference/emprestimoService.ts`.
9. `pages/<Resources>.tsx` with components from `@/components/ui` (rules in
   `.agents/skills/shadcn/SKILL.md`), following `reference/Livros.tsx` (with editing) or
   `reference/Emprestimos.tsx` (with `fk`/action):
   - `Card` with a "Novo" button in `CardAction`; `Table` for the list (even with 2 fields);
     `Dialog` with `<form>` + `FieldGroup`/`Field`/`FieldLabel` to create/edit; `AlertDialog` to delete.
   - States: `Skeleton` while loading, `Empty` with no items, `toast.error(getErrorMessage(err, "..."))`
     on errors and `Spinner` + `disabled` while saving.
   - A `form` state with the whole `<R>Input` and a `vazio` for "Novo". Required field with no
     initial value: `fk` = `0` and `date` = `""` in `vazio`, and "Salvar" disabled until filled
     (`Select` and `Calendar` don't honor `required`). `fk` `Select`: `value={x ? String(x) : ""}`
     and `Number(v)` in `onValueChange`; `SelectItem` always inside `SelectGroup`.
   - `fk`: load the resource and the targets together with `Promise.all` (a single error toast) and
     show the target's name with a lookup that falls back to `"—"`.
   - Currency: `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
10. Register the route in `App.tsx`, add the link to the `links` array in `layouts/MainLayout.tsx`
    and the new route to the list in the "mobile 390px sem scroll horizontal" test in `tests/app.spec.ts`.

Need a component that doesn't exist in `components/ui` yet? `npx shadcn@latest add <name>`.

## Verify before finishing

From the repo root, each line in its own subshell:

```bash
(cd back && uv run ruff check --fix . && uv run pytest)   # --fix sorts the new import in models/__init__.py
(cd front && npm run build)
npx playwright test --project=chromium                   # fast; npm run test:e2e runs all 3 browsers
```

If the resource has a main UI flow, add a test in `tests/app.spec.ts` following
`reference/e2e_emprestimo.spec.ts`. Tips:
- `fk` prerequisites (the book and the member of the loan): create them via
  `request.post("/api/...")`, not through the screen; the test stays short and tests only the new flow.
- Form in `page.getByRole("dialog")`; `Select` options open in a portal, so search the page:
  `page.getByRole("option", { name })`.
- `Calendar` day with `locale={ptBR}`: the name is on the day button, not the cell:
  `page.getByRole("grid").getByRole("button", { name: /, 15 de / })`.
- Deletion in `page.getByRole("alertdialog")`; rows with `page.getByRole("row").filter({ hasText })`.

The Vite warning "chunks larger than 500 kB" after using `Calendar` (date-fns) is expected and
doesn't break the deploy.
