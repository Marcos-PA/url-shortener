---
name: brief
description: Turns the brief of an interview project / take-home test into an executable plan for this template (entities and fields in /new-resource syntax, business rules, what falls outside the template, ambiguities with a default assumption, and ordered steps with commit/deploy). Use whenever the user pastes or describes the brief, challenge, case or requirements of a project ("the brief is...", "o enunciado é...", "I have 2h to do this", "tenho 2h pra fazer isso", "help me start this test", "o que eu faço primeiro?"), even if they don't explicitly ask for a plan, and before writing any code for a new project.
argument-hint: <brief text>
---

# From brief to plan

Brief: `$ARGUMENTS` (if empty, use the text the user pasted in the conversation; if there is none, ask for it).

The clock is running (≈2h total). The plan exists so the first 10 minutes save the other 110:
everything the brief asks for has to fit, working and live, before any extra. That's why the plan
is short, concrete and decided; it is not a requirements document.

**Don't write code or change files at this stage.** Present the plan and wait for the user to
confirm (or correct the assumptions). Once confirmed, execute step by step.

## How to read the brief

Read the whole text before deciding anything. Then:

1. **Nouns that get registered/listed → resources.** "customers", "books", "orders".
   A noun that is just an attribute of another ("product category" with no screen of its own) becomes
   an `enum(...)` field, not a resource: less code, same result.
2. **Attributes → fields** in `/new-resource` syntax (read the "Syntax" section of
   `.claude/skills/new-resource/SKILL.md`): types `str text int float bool date time datetime email
   enum(a|b) fk:<target>`, `field?` optional, `field!` unique, `no:edit,delete` at the end.
   The brief didn't name the fields? Propose the minimum that makes sense and mark it as an assumption.
3. **"Y belongs to X" → `x_id:fk:x` on Y**, with X created first. Deleting X that has Ys becomes a
   409 (without it, Postgres returns a 500). **Items of a parent** (order item with product and
   quantity) **are not a resource**: they are a model + nested schema of the parent, created in the
   same POST and the same commit, with no screen or CRUD of their own (a standalone CRUD would bypass
   the parent's rule). The parent comes from `/new-resource` and then gets the items: say so and
   estimate it (≈ +20-30 min).
4. **A record that is a process** (loan, order, appointment): what happens after it's created is an
   **action** (`POST /{id}/devolver`, `/cancelar`), not free editing. Mark it `no:edit` (and
   `no:delete` if deleting would undo effects, like reduced stock), and list each action as a rule.
5. **Verbs and constraints → business rules.** "can't", "only if", "when", "automatically",
   "overdue", "total". Each rule lives in the back-end service (never only in the front, which can be
   bypassed), returns an `HTTPException` with a `detail` in Portuguese (the front already shows it via
   `getErrorMessage`) and gets a line in the pytest test. Computed values (total, overdue, balance)
   go out in the response schema, computed in the service.
6. **What the template doesn't have ready** (login/auth, file upload, charts, email, external API,
   real time): say what it is, the cost in minutes and the minimal version that meets the brief. If
   the brief **requires** it, it goes into the plan; if it's a "differential"/"bonus", it goes to extras.
   **Login** has a hidden cost: protecting the routes breaks the existing tests (Task pytest and
   `tests/app.spec.ts`), which then need a token. In the same step, add a test helper that registers,
   logs in and returns the headers, and count ≈ 40 min total. Minimal version with no new lib:
   password with `hashlib.scrypt` and a `secrets.token_urlsafe()` token stored on the user.
   The `Usuario` model is part of the login step (it's not a `/new-resource`: it has password and
   token, no CRUD), and login comes **right after deploy, before the resources**, because resources
   that belong to the user reference it: `usuario_id=:fk:usuario` (the `=` in `/new-resource` means
   the back fills it with the logged-in user). Login costs ≈ 40 of the ≈ 100 min: start with the
   narrowest version (a single role, no password recovery) and put secondary rules (business hours,
   minimum time, limits) in extras, keeping in the MVP only the rules the brief mentions.

## Ambiguities

Interview briefs are vague on purpose, and the evaluator often looks at how you handle that.
For each ambiguity, write the **default assumption** you'll follow, so the user only corrects what
they disagree with. Actually ask (at most 3 questions) only when the answer changes the data model
or the scope in a way that's expensive to undo later (e.g., "does each customer see only their own
data?" decides whether login is needed). Everything else proceeds with the assumption.

## Response format

Use this structure, in the user's language, with no empty sections:

```
## Understanding
<2-3 lines: what the system does and who uses it>

## Project
/new-project <kebab-name> "<Title>"      ← public repo created from the template

## Resources
/new-resource <name> <field:type> ...    ← one per line, in creation order (fk target first)

## Business rules
- <rule> → <where: service X, HTTP status> · test: <what pytest checks>

## Outside the template
- <item> → <minimal version> (~N min) · required | extra

## Assumptions (correct me if you disagree)
- <ambiguity> → <what I'll assume>

## Blocking questions       ← only if any, max. 3

## Steps
1. <step> · commit + push   (≈ N min)
...
MVP live in ≈ N min · Extras, if time allows: <list in order of value>
```

## Building the steps

- **Step 0 is always `/new-project <name> "<Title>"`:** creates the GitHub repo from the template,
  already renamed, with green checks and first push (≈ 5 min). Pick a short name that describes the
  domain (`biblioteca-comunitaria`, `controle-pedidos`); it's what the evaluator sees in the link.
- **Step 1 is always connecting the new repo's deploy** (Supabase + Render Blueprint + Vercel, ≈ 15 min
  the first time, walkthrough in the README) and opening the public URL with "API: ok · Banco: ok".
  This catches deploy problems early, while they're still cheap; without it, the pushes in the
  following steps publish nothing.
- **One step per resource** via `/new-resource`, in `fk` order (the referenced one comes first).
  Each step ends with the `/new-resource` check (ruff, pytest, build) and commit + push.
- **Business rules right after the resource they belong to**, with the test alongside.
- **Screens that combine resources** (dashboard, "overdue", report) after the resources they use.
- **Task is the `/new-resource` reference example**: don't delete it at the start. In the last MVP
  step, remove Task (back, front, pytest and route/link) **and replace its tests in `tests/app.spec.ts`**
  with an E2E of the project's main flow; the generic tests (home with status, mobile, API down,
  clean console) just need to point to the new page. Without this, `npm run test:e2e` breaks.
- **Last MVP step:** open the public URL, run the main flow by hand and update the README with what
  was done and the assumptions made (the evaluator reads the README).
- Estimate minutes per step. A simple CRUD via `/new-resource` ≈ 10-15 min; with `fk` ≈ 15-20; a
  business rule with test ≈ 10; login ≈ 40; nested items ≈ +20-30. Count steps 0 and 1
  (≈ 20 min). If the MVP goes over ~100 min, cut: move what the brief doesn't require to extras and
  say what was cut. If **the required part alone** already goes over, don't cut requirements:
  simplify the version of each one (no editing, no filters beyond what's asked, single screen) and
  tell the user the risk and what's left out.

## After confirmation

Run step 0 (`/new-project`) with the plan already corrected by the user: it creates the repo, saves
the plan to `PLAN.md` in the new folder and ends by asking to open Claude Code there. The following
steps run in that new session, not this one (which is in the template's directory).

In the project session, execute the steps in order, using `/new-resource` for each resource and
following `CLAUDE.md`. At the end of each step: green checks, commit, push, and one line to the user
saying what's done and what's next. If something goes off plan (a step ran over time, an assumption
turned out wrong), say so and propose the adjustment before continuing.
