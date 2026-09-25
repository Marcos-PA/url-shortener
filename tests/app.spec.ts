import { expect, test, type Page } from "@playwright/test";

// Banco SQLite descartável (ver webServer no playwright.config.ts), recriado a cada execução.

// The page has two tables (your links and the most clicked ranking): rows of the first one.
const linksTable = (page: Page) => page.getByRole("table", { name: "Your links" });

test("links: encurta, abre o link curto e o clique é contado", async ({ page, context }) => {
  const url = `https://example.com/e2e/${Date.now()}`;
  await context.route("https://example.com/**", (r) => r.fulfill({ body: "destino" }));
  await page.goto("/");
  await page.getByLabel("Long URL").fill(url);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByLabel("Long URL")).toHaveValue("");

  const linkRow = linksTable(page).getByRole("row").filter({ hasText: url });
  const shortLink = linkRow.getByRole("link");
  await expect(shortLink).toHaveText(/^[A-Za-z0-9]{7}$/);
  await expect(shortLink).toHaveAttribute("href", /^http:\/\/localhost:8001\/[A-Za-z0-9]{7}$/);
  await expect(page.getByRole("alert").getByRole("link")).toHaveAttribute("href", (await shortLink.getAttribute("href"))!);
  await expect(linkRow.getByRole("cell").nth(2)).toHaveText("0");
  const ruler = page.getByRole("figure");
  await expect(ruler).toContainText(`${url.length} chars`);
  await expect(ruler).toContainText(/\d+% shorter/);
  await expect(page.locator("svg title", { hasText: "QR code for" })).toHaveCount(0);

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
  const linkRow = linksTable(page).getByRole("row").filter({ hasText: url });

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

test("copiar põe o link curto na área de transferência", async ({ page, context, request, browserName }) => {
  test.skip(browserName !== "chromium", "permissão de clipboard só no Chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { code, short_url } = await (await request.post("/api/links", { data: { url: `https://example.com/copy/${Date.now()}` } })).json();
  await page.goto("/");
  await page.getByRole("button", { name: `Copy "${code}"` }).click();
  await expect(page.getByText("Short link copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(short_url);
});

test("botão QR code encurta e mostra o QR sem clicar em Shorten", async ({ page }) => {
  const url = `https://example.com/qr/${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Long URL").fill(url);
  await page.getByRole("button", { name: "QR code" }).click();
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toBeVisible();
  const shortUrl = await page.getByRole("alert").getByRole("link").textContent();
  await expect(page.locator("svg title")).toHaveText(`QR code for ${shortUrl}`);
});

test("botão QR code depois de encurtar mostra o QR do último link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "QR code" })).toBeDisabled();
  await page.getByLabel("Long URL").fill(`https://example.com/qr-after/${Date.now()}`);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByRole("figure")).toBeVisible();
  await expect(page.locator("svg title")).toHaveCount(0);
  await page.getByRole("button", { name: "QR code" }).click();
  const shortUrl = await page.getByRole("alert").getByRole("link").textContent();
  await expect(page.locator("svg title")).toHaveText(`QR code for ${shortUrl}`);
});

test("link personalizado usa o nome escolhido e recusa nome repetido", async ({ page }) => {
  const alias = `p${Date.now() % 1e9}`;
  await page.goto("/");
  await page.getByLabel("Long URL").fill(`https://example.com/personal/${alias}`);
  await page.getByLabel("Personal link (optional)").fill(alias);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByRole("alert").getByRole("link")).toHaveText(new RegExp(`/${alias}$`));
  await expect(page.getByLabel("Personal link (optional)")).toHaveValue("");

  await page.getByLabel("Long URL").fill(`https://example.com/personal/${alias}/2`);
  await page.getByLabel("Personal link (optional)").fill(alias);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByText("This personal link is already taken")).toBeVisible();
});

test("conta: criar, encurtar, sair e entrar de novo mantém os links do usuário", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const url = `https://example.com/mine/${Date.now()}`;
  const header = page.getByRole("banner");

  await page.goto("/");
  await header.getByRole("link", { name: "Log in" }).click();
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill("s3cret-pass");
  await page.getByRole("main").getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/");
  await expect(header.getByText(email)).toBeVisible();
  await expect(page.getByText(/Your links · 0 shortened/)).toBeVisible();
  await page.getByLabel("Long URL").fill(url);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toBeVisible();

  await header.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByText(/log in to keep track/)).toBeVisible();
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toHaveCount(0);

  await header.getByRole("link", { name: "Log in" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill("wrong-pass");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid e-mail or password")).toBeVisible();

  await page.getByLabel("Password").fill("s3cret-pass");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toBeVisible();

  await page.reload();
  await expect(header.getByText(email)).toBeVisible();
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toBeVisible();
});

test("tabela 'Most clicked' mostra o ranking sem o dono", async ({ page, request }) => {
  const email = `top-${Date.now()}@example.com`;
  const { access_token } = await (await request.post("/api/auth/register", { data: { email, password: "s3cret-pass" } })).json();
  const url = `https://example.com/top/${Date.now()}`;
  const { code } = await (
    await request.post("/api/links", { data: { url }, headers: { Authorization: `Bearer ${access_token}` } })
  ).json();
  for (let i = 0; i < 20; i++) await request.get(`http://localhost:8001/${code}`, { maxRedirects: 0 });

  await page.goto("/"); // anonymous visitor
  const top = page.getByRole("table", { name: "Most clicked links" });
  const row = top.getByRole("row").filter({ hasText: code });
  await expect(row).toContainText(url);
  await expect(row.getByRole("cell").last()).toHaveText("20");
  await expect(top.getByRole("row").nth(1)).toContainText(code); // row 0 is the header
  await expect(top).not.toContainText(email);
  await expect(linksTable(page).getByRole("row").filter({ hasText: code })).toHaveCount(0);
});

test("url repetida mostra o erro do back no toast", async ({ page, request }) => {
  const url = `https://example.com/dup/${Date.now()}`;
  await request.post("/api/links", { data: { url } });
  await page.goto("/");
  await page.getByLabel("Long URL").fill(url);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByText("This URL has already been shortened")).toBeVisible();
  await expect(linksTable(page).getByRole("row").filter({ hasText: url })).toHaveCount(1);
});

test("url inválida mostra o erro do back no toast", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Long URL").fill("ftp://example.com");
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByText(/^url: URL scheme should be/)).toBeVisible();
});

test("mobile 390px sem scroll horizontal", async ({ page, request }) => {
  await request.post("/api/links", { data: { url: `https://example.com/${Date.now()}/${"a".repeat(200)}` } });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(linksTable(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

  await page.getByLabel("Long URL").fill(`https://example.com/mobile/${Date.now()}/${"b".repeat(80)}`);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByRole("figure")).toBeVisible();
  expect(await page.getByRole("alert").evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
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
