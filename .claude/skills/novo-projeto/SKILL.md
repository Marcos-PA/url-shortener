---
name: novo-projeto
description: Cria o repositório de um projeto novo no GitHub a partir do template Marcos-PA/fullstack-template (gh repo create --template), clona ao lado deste repo, personaliza nome/título, roda os checks, faz o primeiro push e deixa o plano em PLANO.md. Use quando pedirem "novo projeto", "criar o repo do projeto", "começar o projeto X a partir do template" ou /novo-projeto, e como passo 0 do plano do /enunciado depois que o usuário confirmar.
argument-hint: <nome-do-repo> [título] [--private]  ex: biblioteca-comunitaria "Biblioteca Comunitária"
---

# Novo projeto a partir do template

Pedido: `$ARGUMENTS`

Cria um repo **público** (o avaliador precisa abrir o link) em `github.com/<usuário>/<nome>` usando o
template `Marcos-PA/fullstack-template`, e clona em `<pasta pai deste repo>/<nome>`. Só `--private`
se o usuário pedir. Nunca sobrescreve nada: se o nome já existe, para e pede outro.

## 1. Nome e título

- `<nome>`: kebab-case minúsculo, sem acento (`^[a-z0-9][a-z0-9-]{1,48}$`), ex.: `biblioteca-comunitaria`.
  Veio com espaço/acento? Converta e mostre o resultado.
- `<título>`: o nome legível para a UI (`Biblioteca Comunitária`). Não veio? Derive do nome.
- Sem nome nenhum? Sugira um a partir do enunciado e confirme antes de criar (criar repo público é
  visível para outras pessoas e não dá para desfazer daqui: o token não tem permissão de apagar repo).

## 2. Checagens (todas antes de criar qualquer coisa)

```bash
gh auth status                                   # logado e com escopo repo
PARENT="$(dirname "$(git rev-parse --show-toplevel)")"
OWNER="$(gh api user --jq .login)"
test ! -e "$PARENT/<nome>"                       # pasta local livre
! gh repo view "$OWNER/<nome>" >/dev/null 2>&1   # repo remoto livre
```

Qualquer uma falhou → pare e diga qual. Não tente "consertar" apagando ou renomeando coisas existentes.

## 3. Criar e clonar

```bash
cd "$PARENT" && gh repo create "<nome>" --template Marcos-PA/fullstack-template --public --clone \
  --description "<título> — React + FastAPI"
```

O GitHub gera o repo a partir do template de forma assíncrona: se a pasta não apareceu ou veio vazia,
espere alguns segundos e rode `gh repo clone "$OWNER/<nome>" "$PARENT/<nome>"` (até 3 tentativas).

**Daqui em diante, todo comando roda com `cd "$PARENT/<nome>" && ...` no mesmo comando.** O shell
volta para o repo do template entre comandos, e um `git commit` sem o `cd` iria para o template.

## 4. Personalizar (arquivos do repo novo)

| Arquivo | Troque |
| --- | --- |
| `front/index.html` | `<title>Tasks</title>` → `<title><título></title>` |
| `front/src/layouts/MainLayout.tsx` | o texto da marca `Tasks` dentro do `<Link to="/" ...>` do header → `<título>` (não mexa no link "Tasks" do array `links`: ele continua valendo até Task sair) |
| `front/src/pages/Home.tsx` | `Projeto pronto` → `<título>` |
| `tests/app.spec.ts` | `{ name: "Projeto pronto" }` → `{ name: "<título>" }` (senão o E2E quebra) |
| `README.md` | 1ª linha `# fullstack-template` → `# <título>`; logo abaixo, uma linha: `Feito a partir do [fullstack-template](https://github.com/Marcos-PA/fullstack-template).` |
| `render.yaml` | `name: api` → `name: <nome>-api` |
| `package.json` (raiz) | `"name"` → `"<nome>"`; as URLs `fullstack-template` → `<nome>` |

Use edições exatas (Edit), não `sed` em JSX. Se algum texto acima não existir mais no template,
procure o equivalente e diga o que mudou.

## 5. Instalar e verificar

```bash
cd "$PARENT/<nome>" && npm install && (cd front && npm install) && (cd back && uv sync)
cd "$PARENT/<nome>/back" && uv run ruff check . && uv run pytest
cd "$PARENT/<nome>/front" && npm run build
cd "$PARENT/<nome>" && npx playwright test --project=chromium
```

Tudo verde antes do commit. Falhou? Corrija (é quase sempre a personalização do passo 4) e rode de novo.

## 6. Primeiro commit

```bash
cd "$PARENT/<nome>" && git add -A && git commit -m "Inicia <título> a partir do fullstack-template" && git push
```

## 7. Plano para a próxima sessão

Se veio do `/enunciado`, salve o plano confirmado (as seções que o usuário aprovou, com as correções
dele) em `$PARENT/<nome>/PLANO.md` e não versione: `echo PLANO.md >> "$PARENT/<nome>/.git/info/exclude"`.
Assim uma sessão nova do Claude Code na pasta do projeto retoma de onde parou.

## 8. Entregar e parar

Responda com:

- **Repo:** `https://github.com/<OWNER>/<nome>` · **Pasta:** `$PARENT/<nome>` · checks verdes (diga quais rodaram).
- **Deploy (manual, ~15 min, uma vez por projeto):** siga "Deploy" do README do projeto novo:
  Supabase (projeto novo ou o mesmo, se as tabelas não colidirem) → Render: New → Blueprint →
  `<OWNER>/<nome>` (serviço `<nome>-api`) → Vercel: repo `<nome>`, Root Directory `front`,
  `VITE_API_URL` → voltar no Render e ajustar `CORS_ORIGINS`. Depois disso cada push faz deploy.
- **Próximo passo:** abrir o Claude Code na pasta nova e continuar o plano de lá:
  `cd $PARENT/<nome> && claude` e dizer "siga o PLANO.md a partir do próximo passo".

Pare aqui. Não rode `/novo-recurso` nesta sessão: ela está no diretório do template, e os caminhos
relativos da skill iriam parar no lugar errado.
