import { expect, test } from "@playwright/test";

// Banco SQLite descartável (ver webServer no playwright.config.ts), recriado a cada execução.

test("links: encurta, abre o link curto e o clique é contado", async ({ page, context }) => {
  const url = `https://example.com/e2e/${Date.now()}`;
  await context.route("https://example.com/**", (r) => r.fulfill({ body: "destino" }));
  await page.goto("/");
  await page.getByLabel("Long URL").fill(url);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByLabel("Long URL")).toHaveValue("");

  const linkRow = page.getByRole("row").filter({ hasText: url });
  const shortLink = linkRow.getByRole("link");
  await expect(shortLink).toHaveText(/^[A-Za-z0-9]{7}$/);
  await expect(shortLink).toHaveAttribute("href", /^http:\/\/localhost:8001\/[A-Za-z0-9]{7}$/);
  await expect(page.getByRole("alert").getByRole("link")).toHaveAttribute("href", (await shortLink.getAttribute("href"))!);
  await expect(linkRow.getByRole("cell").nth(2)).toHaveText("0");

  const [tab] = await Promise.all([context.waitForEvent("page"), shortLink.click()]);
  await expect(tab).toHaveURL(url);
  await tab.close();

  await page.reload();
  await expect(linkRow.getByRole("cell").nth(2)).toHaveText("1");
});

test("excluir pede confirmação e remove o link", async ({ page, request }) => {
  const url = `https://example.com/delete/${Date.now()}`;
  const { code } = await (await request.post("/api/links", { data: { url } })).json();
  await page.goto("/");
  const linkRow = page.getByRole("row").filter({ hasText: url });

  await page.getByRole("button", { name: `Delete "${code}"` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(linkRow).toBeVisible();

  await page.getByRole("button", { name: `Delete "${code}"` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(linkRow).toHaveCount(0);
  await expect(page.getByText(`Link "${code}" deleted.`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/\d+ shortened/)).toBeVisible();
  await expect(linkRow).toHaveCount(0);
});

test("url inválida mostra o erro do back no toast", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Long URL").fill("ftp://example.com");
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByText(/^url: URL scheme should be/)).toBeVisible();
});

test("mobile 390px sem scroll horizontal", async ({ page, request }) => {
  await request.post("/api/links", { data: { url: `https://example.com/${"a".repeat(200)}` } });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test("API fora do ar mostra toast de erro e estado vazio", async ({ page }) => {
  await page.route("**/api/**", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByText("Could not load links.")).toBeVisible();
  await expect(page.getByText("No links yet")).toBeVisible();
});

test("sem erros no console no fluxo normal", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText(/\d+ shortened/)).toBeVisible();
  expect(errors).toEqual([]);
});
