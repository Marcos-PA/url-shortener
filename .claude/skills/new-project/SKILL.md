---
name: new-project
description: Creates the GitHub repository for a new project from the Marcos-PA/fullstack-template template (gh repo create --template), clones it next to this repo, customizes name/title, runs the checks, makes the first push and leaves the plan in PLAN.md. Use when asked for a "new project", "create the project repo", "start project X from the template", "novo projeto" or /new-project, and as step 0 of the /brief plan after the user confirms.
argument-hint: <repo-name> [title] [--private]  e.g.: biblioteca-comunitaria "Biblioteca Comunitária"
---

# New project from the template

Request: `$ARGUMENTS`

Creates a **public** repo (the evaluator needs to open the link) at `github.com/<user>/<name>` using
the `Marcos-PA/fullstack-template` template, and clones it into `<parent folder of this repo>/<name>`.
Only `--private` if the user asks. Never overwrites anything: if the name already exists, stop and
ask for another.

## 1. Name and title

- `<name>`: lowercase kebab-case, no accents (`^[a-z0-9][a-z0-9-]{1,48}$`), e.g.: `biblioteca-comunitaria`.
  Came with spaces/accents? Convert it and show the result.
- `<title>`: the human-readable name for the UI (`Biblioteca Comunitária`). Not given? Derive it from the name.
- No name at all? Suggest one based on the brief and confirm before creating (creating a public repo
  is visible to other people and can't be undone from here: the token has no permission to delete repos).

## 2. Checks (all before creating anything)

```bash
gh auth status                                   # logged in and with repo scope
PARENT="$(dirname "$(git rev-parse --show-toplevel)")"
OWNER="$(gh api user --jq .login)"
test ! -e "$PARENT/<name>"                       # local folder free
! gh repo view "$OWNER/<name>" >/dev/null 2>&1   # remote repo free
```

Any of them failed → stop and say which. Don't try to "fix" it by deleting or renaming existing things.

## 3. Create and clone

```bash
cd "$PARENT" && gh repo create "<name>" --template Marcos-PA/fullstack-template --public --clone \
  --description "<title> — React + FastAPI"
```

GitHub generates the repo from the template asynchronously: if the folder didn't appear or came
empty, wait a few seconds and run `gh repo clone "$OWNER/<name>" "$PARENT/<name>"` (up to 3 attempts).

**From here on, every command runs with `cd "$PARENT/<name>" && ...` in the same command.** The shell
goes back to the template repo between commands, and a `git commit` without the `cd` would land in
the template.

## 4. Customize (files of the new repo)

| File | Change |
| --- | --- |
| `front/index.html` | `<title>Tasks</title>` → `<title><title></title>` |
| `front/src/layouts/MainLayout.tsx` | the brand text `Tasks` inside the header's `<Link to="/" ...>` → `<title>` (don't touch the "Tasks" link in the `links` array: it stays until Task is removed) |
| `front/src/pages/Home.tsx` | `Projeto pronto` → `<title>` |
| `tests/app.spec.ts` | `{ name: "Projeto pronto" }` → `{ name: "<title>" }` (otherwise the E2E breaks) |
| `README.md` | 1st line `# fullstack-template` → `# <title>`; right below, one line: `Feito a partir do [fullstack-template](https://github.com/Marcos-PA/fullstack-template).` |
| `render.yaml` | `name: api` → `name: <name>-api` |
| `package.json` (root) | `"name"` → `"<name>"`; the `fullstack-template` URLs → `<name>` |

Use exact edits (Edit), not `sed` on JSX. If any text above no longer exists in the template, look
for the equivalent and say what changed.

## 5. Install and verify

```bash
cd "$PARENT/<name>" && npm install && (cd front && npm install) && (cd back && uv sync)
cd "$PARENT/<name>/back" && uv run ruff check . && uv run pytest
cd "$PARENT/<name>/front" && npm run build
cd "$PARENT/<name>" && npx playwright test --project=chromium
```

Everything green before the commit. Failed? Fix it (it's almost always the customization from step 4)
and run again.

## 6. First commit

```bash
cd "$PARENT/<name>" && git add -A && git commit -m "Start <title> from fullstack-template" && git push
```

## 7. Plan for the next session

If it came from `/brief`, save the confirmed plan (the sections the user approved, with their
corrections) to `$PARENT/<name>/PLAN.md` and don't version it: `echo PLAN.md >> "$PARENT/<name>/.git/info/exclude"`.
That way a new Claude Code session in the project folder picks up where it left off.

## 8. Deliver and stop

Reply with:

- **Repo:** `https://github.com/<OWNER>/<name>` · **Folder:** `$PARENT/<name>` · green checks (say which ran).
- **Deploy (manual, ~15 min, once per project):** follow "Deploy" in the new project's README:
  Supabase (new project or the same one, if the tables don't collide) → Render: New → Blueprint →
  `<OWNER>/<name>` (service `<name>-api`) → Vercel: repo `<name>`, Root Directory `front`,
  `VITE_API_URL` → back to Render to set `CORS_ORIGINS`. After that, every push deploys.
- **Next step:** open Claude Code in the new folder and continue the plan from there:
  `cd $PARENT/<name> && claude` and say "follow PLAN.md from the next step".

Stop here. Don't run `/new-resource` in this session: it's in the template's directory, and the
skill's relative paths would end up in the wrong place.
