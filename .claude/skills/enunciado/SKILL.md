---
name: enunciado
description: Transforma o enunciado de um projeto de entrevista/teste técnico num plano executável para este template (entidades e campos na sintaxe do /novo-recurso, regras de negócio, o que foge do template, ambiguidades com suposição padrão e passos ordenados com commit/deploy). Use sempre que o usuário colar ou descrever o enunciado, desafio, case ou requisitos de um projeto ("o enunciado é...", "tenho 2h pra fazer isso", "me ajuda a começar esse teste", "o que eu faço primeiro?"), mesmo que não peça um plano explicitamente, e antes de escrever qualquer código de um projeto novo.
argument-hint: <texto do enunciado>
---

# Do enunciado ao plano

Enunciado: `$ARGUMENTS` (se vazio, use o texto que o usuário colou na conversa; se não houver, peça).

O relógio está correndo (≈2h no total). O plano existe para que os primeiros 10 minutos poupem os
outros 110: tudo que o enunciado pede precisa caber, funcionando e no ar, antes de qualquer extra.
Por isso o plano é curto, concreto e decidido; não é um documento de requisitos.

**Não escreva código nem altere arquivos nesta etapa.** Apresente o plano e espere o usuário
confirmar (ou corrigir as suposições). Depois de confirmado, execute passo a passo.

## Como ler o enunciado

Leia o texto inteiro antes de decidir qualquer coisa. Depois:

1. **Substantivos que são cadastrados/listados → recursos.** "clientes", "livros", "pedidos".
   Um substantivo que é só um atributo de outro ("categoria do produto" sem tela própria) vira campo
   `enum(...)`, não recurso: menos código, mesmo resultado.
2. **Atributos → campos** na sintaxe do `/novo-recurso` (leia a seção "Sintaxe" de
   `.claude/skills/novo-recurso/SKILL.md`): tipos `str text int float bool date time datetime email
   enum(a|b) fk:<alvo>`, `campo?` opcional, `campo!` único, `sem:editar,excluir` no fim.
   O enunciado não citou os campos? Proponha o mínimo que faz sentido e marque como suposição.
3. **"Y pertence a X" → `x_id:fk:x` em Y**, com X criado antes. Excluir X com Ys vira 409 (sem isso
   dá 500 no Postgres). **Itens de um pai** (item de pedido com produto e quantidade) **não são
   recurso**: são model + schema aninhado do pai, criados no mesmo POST e no mesmo commit, sem tela nem
   CRUD próprios (um CRUD solto burlaria a regra do pai). O pai sai do `/novo-recurso` e depois ganha
   os itens: diga isso e estime (≈ +20-30 min).
4. **Registro que é um processo** (empréstimo, pedido, agendamento): o que acontece depois de criado
   é uma **ação** (`POST /{id}/devolver`, `/cancelar`), não edição livre. Marque `sem:editar` (e
   `sem:excluir` se excluir desfaria efeitos, como estoque baixado), e liste cada ação como regra.
5. **Verbos e restrições → regras de negócio.** "não pode", "só se", "quando", "automaticamente",
   "atrasado", "total". Cada regra mora no service do back (nunca só no front, que é contornável),
   devolve `HTTPException` com `detail` em português (o front já mostra via `getErrorMessage`) e
   ganha uma linha no teste do pytest. Valores calculados (total, atrasado, saldo) saem no schema de
   resposta, calculados no service.
6. **O que o template não tem pronto** (login/auth, upload de arquivo, gráficos, e-mail, API externa,
   tempo real): diga o que é, o custo em minutos e a versão mínima que atende o enunciado. Se o
   enunciado **exige**, entra no plano; se é "diferencial"/"bônus", vai para os extras.
   **Login** tem um custo escondido: proteger as rotas quebra os testes que já existem (pytest de
   Task e `tests/app.spec.ts`), que passam a precisar de token. Coloque no mesmo passo um helper de
   teste que registra, loga e devolve os headers, e conte ≈ 40 min no total. Versão mínima sem lib
   nova: senha com `hashlib.scrypt` e token `secrets.token_urlsafe()` guardado no usuário.
   O model `Usuario` faz parte do passo de login (não é `/novo-recurso`: tem senha e token, não tem
   CRUD), e o login vem **logo depois do deploy, antes dos recursos**, porque os recursos que
   pertencem ao usuário referenciam ele: `usuario_id=:fk:usuario` (o `=` do `/novo-recurso` diz que o
   back preenche com o usuário logado). Login custa ≈ 40 dos ≈ 100 min: comece pela versão mais
   estreita (um papel só, sem recuperação de senha) e coloque regras secundárias (expediente,
   horário mínimo, limites) nos extras, deixando no MVP só as regras que o enunciado cita.

## Ambiguidades

Enunciado de entrevista é vago de propósito, e o avaliador costuma olhar como você lida com isso.
Para cada ambiguidade, escreva a **suposição padrão** que você vai seguir, para o usuário só
corrigir o que discordar. Pergunte de verdade (no máximo 3 perguntas) apenas quando a resposta muda
o modelo de dados ou o escopo de forma cara de desfazer depois (ex.: "cada cliente vê só os
próprios dados?" decide se precisa de login). O resto segue com a suposição.

## Formato da resposta

Use esta estrutura, no idioma do usuário, sem seções vazias:

```
## Entendimento
<2-3 linhas: o que o sistema faz e quem usa>

## Projeto
/novo-projeto <nome-kebab> "<Título>"      ← repo público criado a partir do template

## Recursos
/novo-recurso <nome> <campo:tipo> ...     ← um por linha, na ordem de criação (alvo de fk antes)

## Regras de negócio
- <regra> → <onde: service X, status HTTP> · teste: <o que o pytest verifica>

## Fora do template
- <item> → <versão mínima> (~N min) · obrigatório | extra

## Suposições (corrija se discordar)
- <ambiguidade> → <o que vou assumir>

## Perguntas que bloqueiam       ← só se existirem, máx. 3

## Passos
1. <passo> · commit + push   (≈ N min)
...
MVP no ar em ≈ N min · Extras, se sobrar tempo: <lista em ordem de valor>
```

## Montando os passos

- **Passo 0 é sempre `/novo-projeto <nome> "<Título>"`:** cria o repo no GitHub a partir do template,
  já renomeado, com checks verdes e primeiro push (≈ 5 min). Escolha um nome curto e descritivo do
  domínio (`biblioteca-comunitaria`, `controle-pedidos`); é o que o avaliador vê no link.
- **Passo 1 é sempre conectar o deploy do repo novo** (Supabase + Render Blueprint + Vercel, ≈ 15 min
  na primeira vez, roteiro no README) e abrir a URL pública com "API: ok · Banco: ok". Isso pega
  problema de deploy cedo, quando ainda é barato; sem ele, os pushes dos passos seguintes não publicam nada.
- **Um passo por recurso** via `/novo-recurso`, na ordem das `fk` (quem é referenciado vem antes).
  Cada passo termina com o check do `/novo-recurso` (ruff, pytest, build) e commit + push.
- **Regras de negócio logo depois do recurso a que pertencem**, com o teste junto.
- **Telas que juntam recursos** (dashboard, "atrasados", relatório) depois dos recursos que usam.
- **Task é o exemplo de referência do `/novo-recurso`**: não apague no começo. No último passo do MVP,
  remova Task (back, front, pytest e rota/link) **e troque os testes dela em `tests/app.spec.ts`**
  por um E2E do fluxo principal do projeto; os testes genéricos (home com status, mobile, API fora do
  ar, console limpo) só precisam apontar para a página nova. Sem isso o `npm run test:e2e` quebra.
- **Último passo do MVP:** abrir a URL pública, fazer o fluxo principal na mão e atualizar o README com
  o que foi feito e as suposições assumidas (o avaliador lê o README).
- Estime minutos por passo. Um CRUD simples via `/novo-recurso` ≈ 10-15 min; com `fk` ≈ 15-20; uma
  regra de negócio com teste ≈ 10; login ≈ 40; itens aninhados ≈ +20-30. Conte os passos 0 e 1
  (≈ 20 min). Se o MVP passar de ~100 min, corte: mova para os extras o que o enunciado não exige e
  diga o que foi cortado. Se **só o obrigatório** já passa disso, não corte requisito: simplifique a
  versão de cada um (sem edição, sem filtros além do pedido, tela única) e diga ao usuário qual é o
  risco e o que fica de fora.

## Depois da confirmação

Rode o passo 0 (`/novo-projeto`) com o plano já corrigido pelo usuário: ele cria o repo, salva o plano
em `PLANO.md` na pasta nova e termina pedindo para abrir o Claude Code lá. Os passos seguintes rodam
nessa sessão nova, não nesta (que está no diretório do template).

Na sessão do projeto, execute os passos em ordem, usando `/novo-recurso` para cada recurso e seguindo o `CLAUDE.md`. Ao fim
de cada passo: checks verdes, commit, push, e uma linha para o usuário dizendo o que ficou pronto e
qual é o próximo. Se algo sair do plano (um passo estourou o tempo, uma suposição se mostrou errada),
avise e proponha o ajuste antes de seguir.
