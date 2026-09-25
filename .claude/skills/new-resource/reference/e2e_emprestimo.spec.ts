test("empréstimo: criar, devolver e excluir (livro com empréstimo não pode ser excluído)", async ({ page, request }) => {
  const titulo = `${TAG} Livro`;
  const nome = `${TAG} Membro`;
  await request.post("/api/livros", { data: { titulo, isbn: `isbn-${Date.now()}` } });
  await request.post("/api/membros", { data: { nome, email: `m${Date.now()}@x.com` } });

  await page.goto("/emprestimos");
  await page.getByRole("button", { name: "Novo" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Livro").click();
  await page.getByRole("option", { name: titulo }).click();
  await dialog.getByLabel("Membro").click();
  await page.getByRole("option", { name: nome }).click();
  await dialog.getByLabel("Data prevista").click();
  // Com locale ptBR o gridcell não tem nome; o botão do dia se chama "terça-feira, 15 de setembro de 2026".
  await page.getByRole("grid").getByRole("button", { name: /, 15 de / }).click();
  await dialog.getByLabel("Hora da retirada").fill("09:30");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  const linha = page.getByRole("row").filter({ hasText: titulo });
  await expect(linha).toContainText(nome);
  await expect(linha).toContainText("15/");
  await expect(linha).toContainText("09:30");

  await page.goto("/livros");
  await page.getByRole("button", { name: `Excluir "${titulo}"` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Livro possui empréstimos e não pode ser excluído")).toBeVisible();

  await page.goto("/emprestimos");
  await linha.getByRole("button", { name: `Devolver "${titulo}"` }).click();
  await expect(linha.getByRole("button", { name: `Devolver "${titulo}"` })).toHaveCount(0);
  await expect(linha.getByRole("cell").nth(3)).not.toHaveText("—");

  await linha.getByRole("button", { name: /Excluir/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(linha).toHaveCount(0);
});
