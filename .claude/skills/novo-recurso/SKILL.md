---
name: novo-recurso
description: Cria um recurso CRUD completo (model, schema, service, rota e teste no back; tipo, service e página shadcn no front) seguindo as convenções do projeto. Use quando pedirem "novo recurso", "novo CRUD", "nova entidade", "cadastro de X" ou /novo-recurso.
argument-hint: <nome> <campo:tipo>... [sem:editar,excluir]  ex: livro titulo:str isbn!:str ano?:int  ·  emprestimo livro_id:fk:livro emprestado_em=:date devolvido_em?=:date sem:editar
---

# Novo recurso CRUD

Pedido: `$ARGUMENTS`

Referências, nesta ordem:
- **Task** (`back/app/**/task*.py`, `front/src/pages/Tasks.tsx`): estrutura de arquivos, nomes, rotas
  finas, service com 404. Tasks.tsx é uma lista de um campo só: não use o layout dela para
  recursos com formulário.
- **`referencia/`** (nesta pasta da skill), código de um projeto real que passou em ruff, pytest,
  build e E2E. Use como molde, trocando nomes e campos:
  - `Livros.tsx`: página com `Table`, `Dialog` de criar/editar, `AlertDialog` de excluir, campo
    opcional numérico. `service_livros.py` / `schema_livro.py`: campo único (`!`) checado no create e
    no update, 409 ao excluir alvo com filhos.
  - `Emprestimos.tsx`: `Select` de `fk`, `Calendar`, `time`, ação na linha, `sem:editar` (dialog só de
    criação). `service_emprestimos.py` / `schema_emprestimo.py` / `route_emprestimo.py`: 404 do `fk`,
    ação `/devolver`, data de hoje com fuso, campos preenchidos pelo back fora do Create.
  - `test_api_trecho.py` (pytest) e `e2e_emprestimo.spec.ts` (Playwright).

Nomes: `<recurso>` no singular em snake_case (`produto`), classe em PascalCase (`Produto`),
tabela e URL no plural (`produtos`, `/produtos`), funções `create_<recurso>`, `list_<recursos>`,
`get_<recurso>`, `update_<recurso>`, `delete_<recurso>`. Identificadores sem acento; **todo texto
que o usuário vê com acento e grafia certa** ("Empréstimo", "E-mail já cadastrado", "ISBN").

Faltou nome ou campos? Pergunte uma vez, com um exemplo do formato. Não chute campos.

## Sintaxe

`<campo><modificadores>:<tipo>`. Modificadores (podem combinar, ex.: `devolvido_em?=:date`):

- `?` **opcional**: pode ficar vazio.
- `!` **único**: `unique=True` no model **e** checagem no service no create **e** no update
  (ignorando o próprio id), com `409 "<Campo> já cadastrado"`, porque o `IntegrityError` do banco
  vira 500. Teste: o 2º POST igual dá 409.
- `=` **preenchido pelo back**: data de hoje, usuário logado, algo que uma ação grava. Fica **fora
  do Create, do Update e do formulário**; entra no Response. O service define o valor. Com `?=`, o
  campo começa vazio e uma ação preenche depois (`devolvido_em?=:date` + `/devolver`).

`sem:editar` / `sem:excluir` / `sem:editar,excluir` (no fim) não gera PATCH e/ou DELETE: nem rota,
service, `<R>Update`, função do front, botão nem linha do teste. Com `sem:editar`, o `Dialog` é só
de criação (título fixo "Novo ...", sem estado `editando`). Use para registros que não mudam depois
de criados (pedido que baixou estoque, empréstimo, agendamento): editar ou excluir exigiria desfazer
efeitos, e é mais barato não oferecer.

FK: o campo se chama `<alvo>_id` e o tipo é `fk:<alvo>`: `livro_id:fk:livro`. Na tela, mostre o
nome do alvo, não o id.

## Tipos de campo

| Pedido      | SQLAlchemy (`Mapped[...]`)                         | Pydantic                  | TypeScript | Controle shadcn                    |
| ----------- | -------------------------------------------------- | ------------------------- | ---------- | ---------------------------------- |
| `str`       | `str` + `String(200)`                              | `str = Field(min_length=1, max_length=200)` | `string` | `Input`                  |
| `text`      | `str` + `Text`                                     | `str`                     | `string`   | `Textarea`                         |
| `int`       | `int`                                              | `int`                     | `number`   | `Input type="number"`              |
| `float`     | `float`                                            | `float`                   | `number`   | `Input type="number" step="0.01"`  |
| `bool`      | `bool` + `Boolean, default=False`                  | `bool = False`            | `boolean`  | `Checkbox` (form) / `Switch`       |
| `date`      | `date` + `Date`                                    | `date`                    | `string` (`YYYY-MM-DD`) | `Popover` + `Calendar` |
| `time`      | `time` + `Time`                                    | `time`                    | `string` (`HH:MM:SS`) | `Input type="time"`       |
| `datetime`  | `datetime` + `DateTime`                            | `datetime`                | `string` (ISO) | só leitura na tela (ver nota)     |
| `email`     | `str` + `String(200)`                              | `str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")` | `string` | `Input type="email"` |
| `enum(a\|b)` | `str` + `String(20)`                               | `Literal["a", "b"]`       | `"a" \| "b"` | `Select` (ou `ToggleGroup` se ≤ 5) |
| `fk:<alvo>` | `int` + `ForeignKey("<alvos>.id")`                 | `int`                     | `number`   | `Select` com os itens do alvo      |

- `enum` sem valores (`categoria:enum`)? Pergunte os valores. Defina `Literal` uma vez no schema
  (`Categoria = Literal[...]`) e reuse em Create/Update/Response; no front, um `Record<Categoria, string>`
  com os rótulos alimenta o `Select` e a tabela. Valores sem `:` (`09h30`), porque `:` separa campo e tipo.
- Dinheiro: use `float`. `Decimal` vira **string** no JSON do Pydantic v2 e complica o front.
- **Data de hoje no back:** `datetime.now(ZoneInfo("America/Sao_Paulo")).date()`, nunca `date.today()`.
  O Render roda em UTC (depois das 21h no Brasil gravaria o dia seguinte) e o ruff reprova
  `date.today()` (DTZ011).
- `date` no front: **nunca** `new Date("2026-12-31")` (é UTC e mostra o dia anterior no Brasil). Use
  `parseISO(s)` para ler e `format(d, "yyyy-MM-dd")` para enviar (`date-fns`, já instalado). Exibir:
  `format(parseISO(s), "dd/MM/yyyy")`. Calendar: `<Calendar mode="single" locale={ptBR} ... />` com
  `import { ptBR } from "react-day-picker/locale"`.
- `time`: o Pydantic serializa `"09:30:00"`; o `<input type="time">` devolve `"09:30"`, e o Pydantic
  aceita os dois. Mostre com `hora.slice(0, 5)`.
- `datetime`: para **carimbo do back** (`criado_em=:datetime`), não para o usuário escolher. Agenda com
  data e hora? Dois campos `data:date hora:time`: a regra de conflito vira comparação de igualdade e
  não há fuso no caminho. Exibir: `format(parseISO(s), "dd/MM/yyyy HH:mm")`.
- `email`: `pattern`, porque `EmailStr` exige a lib `email-validator` (CLAUDE.md: sem libs novas sem
  pedido). Teste: e-mail inválido dá 422.
- Opcional (`?`): `Mapped[X | None]` com `nullable=True`, Pydantic `X | None = None` (também no
  Create), TS `x: X | null`. No formulário não é `required`, e vazio vira `null`, não `0`/`""`:
  número `Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber` com
  `value={form.x ?? ""}`; texto e hora `e.target.value || null`. Na tabela mostre `—`.
- `fk`: o SQLite do dev não aplica a FK. No `create_`/`update_`, chame o `get_<alvo>` do service do
  alvo (404 `"<Alvo> não encontrado"`).
- `fk`, lado do **alvo**: excluir um alvo que ainda tem filhos passa no SQLite e dá **500** no
  Postgres de produção. No `delete_` do alvo, conte os filhos e levante
  `409 "<Alvo> possui <filhos> e não pode ser excluído"`, com teste. É uma edição no recurso que já
  existe; faça no mesmo passo.

## Back (`back/`)

1. `app/models/<recurso>.py`: classe herdando `Base` (como `models/task.py`).
   **Importe em `app/models/__init__.py`**, senão a tabela não é criada.
2. `app/schemas/<recurso>.py`: `<R>Create` (sem os campos `=`), `<R>Update` (todos opcionais com
   `default=None`, sem os `=`; não existe com `sem:editar`) e `<R>Response` com
   `model_config = {"from_attributes": True}`.
3. `app/services/<recursos>.py`: as funções do "Nomes" acima, como `services/tasks.py`. Com vários
   campos, `create_` usa `Model(**data.model_dump())` e define os `=` depois.
4. `app/api/routes/<recurso>.py`: `APIRouter(prefix="/<recursos>", tags=["<recursos>"])` com
   GET lista, POST (201), PATCH `/{id}` e DELETE `/{id}` (204), menos o que o `sem:` tirou. Rotas
   finas: só chamam o service. GET `/{id}` só se alguma tela usar.
5. Registrar em `app/api/router.py`.
6. `tests/test_api.py`: `test_<recurso>_crud` cobrindo criar (201), listar, 422 de validação,
   atualizar, excluir (204) e 404 depois de excluir, menos o que o `sem:` tirou; mais as linhas de
   `!` (409), de `fk` (404 no alvo inexistente, 409 ao excluir alvo com filhos) e de cada ação.
   Modelo: `referencia/test_api_trecho.py`.

**Ação além do CRUD** (devolver, cancelar, aprovar, concluir): não use o PATCH. Crie
`POST /<recursos>/{id}/<acao>` com uma função no service que valida o estado (`409 "Empréstimo já
foi devolvido"`), grava o campo e devolve o Response. Rotas fixas (`/atrasados`) vêm **antes** de
`/{id}` no router. Front: botão ícone na linha com `aria-label` `"<Ação> \"<nome>\""`, visível só
quando a ação é possível, e `toast.success` ao concluir. Modelo: `Emprestimos.tsx`.

**Item filho sem tela própria** (item de pedido com produto e quantidade): não é um `/novo-recurso`.
É model + schema aninhado do pai: `PedidoCreate` recebe `itens: list[ItemCreate] = Field(min_length=1)`,
o service do pai cria pai e itens num único `commit` (tudo ou nada), e o Response do pai devolve os
itens. Um CRUD solto de itens deixaria alguém mudar a quantidade sem passar pela regra do pai.

Mudou colunas de um model **já criado** no Supabase? `create_all` não altera tabelas: avise o
usuário para apagar a tabela no Table Editor e reiniciar o back.

## Front (`front/src/`)

7. `types/<recurso>.ts`: interface espelhando `<R>Response`, e `<R>Input` = `Omit<R, "id" | <campos =>>`.
8. `services/<recurso>Service.ts`: `list`, `create`, `update`, `delete` (menos o `sem:`) e uma função
   por ação, usando `api` e caminhos relativos (`/<recursos>`). Modelo: `referencia/emprestimoService.ts`.
9. `pages/<Recursos>.tsx` com componentes de `@/components/ui` (regras em `.agents/skills/shadcn/SKILL.md`),
   no molde de `referencia/Livros.tsx` (com edição) ou `referencia/Emprestimos.tsx` (com `fk`/ação):
   - `Card` com botão "Novo" no `CardAction`; `Table` na lista (mesmo com 2 campos); `Dialog` com
     `<form>` + `FieldGroup`/`Field`/`FieldLabel` para criar/editar; `AlertDialog` para excluir.
   - Estados: `Skeleton` carregando, `Empty` sem itens, `toast.error(getErrorMessage(err, "..."))`
     nos erros e `Spinner` + `disabled` enquanto salva.
   - Um estado `form` com o `<R>Input` inteiro e um `vazio` para "Novo". Campo obrigatório sem valor
     inicial: `fk` = `0` e `date` = `""` no `vazio`, e "Salvar" desabilitado até preencher (o `Select`
     e o `Calendar` não respeitam `required`). `Select` de `fk`: `value={x ? String(x) : ""}` e
     `Number(v)` no `onValueChange`; `SelectItem` sempre dentro de `SelectGroup`.
   - `fk`: carregue o recurso e os alvos juntos com `Promise.all` (um toast de erro só) e mostre o
     nome do alvo com um lookup que cai em `"—"`.
   - Moeda: `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
10. Registrar a rota em `App.tsx`, adicionar o link no array `links` de `layouts/MainLayout.tsx` e a
    rota nova na lista do teste "mobile 390px sem scroll horizontal" em `tests/app.spec.ts`.

Precisa de um componente que ainda não existe em `components/ui`? `npx shadcn@latest add <nome>`.

## Verificar antes de concluir

Da raiz do repo, cada linha no seu próprio subshell:

```bash
(cd back && uv run ruff check --fix . && uv run pytest)   # --fix ordena o import novo em models/__init__.py
(cd front && npm run build)
npx playwright test --project=chromium                   # rápido; npm run test:e2e roda os 3 navegadores
```

Se o recurso tiver fluxo principal na UI, adicione um teste em `tests/app.spec.ts` no molde de
`referencia/e2e_emprestimo.spec.ts`. Dicas:
- Pré-requisitos de `fk` (o livro e o membro do empréstimo): crie via `request.post("/api/...")`, não
  pela tela; o teste fica curto e testa só o fluxo novo.
- Formulário em `page.getByRole("dialog")`; opções do `Select` abrem num portal, então busque na
  página: `page.getByRole("option", { name })`.
- Dia do `Calendar` com `locale={ptBR}`: o nome fica no botão do dia, não na célula:
  `page.getByRole("grid").getByRole("button", { name: /, 15 de / })`.
- Exclusão em `page.getByRole("alertdialog")`; linhas com `page.getByRole("row").filter({ hasText })`.

O aviso do Vite "chunks larger than 500 kB" depois de usar `Calendar` (date-fns) é esperado e
não quebra o deploy.
