import { expect, test, type Page } from "@playwright/test";

const CART_KEY = "breck-cart";
const PRODUCT_SLUG = "adizero-pro-4-brown-and-black";
const CART = [{ slug: PRODUCT_SLUG, size: "38", quantity: 1 }];

/** Bloqueia qualquer chamada de pagamento: este smoke nunca toca checkout real nem Mercado Pago. */
async function blockPayments(page: Page) {
  await page.route("**/api/checkout**", (r) => r.abort());
  await page.route(/mercadopago|mercadolibre|mlstatic/, (r) => r.abort());
}

async function seedCart(page: Page, items: unknown[] = CART) {
  await page.addInitScript(
    ([key, value]) => {
      // Só semeia na primeira carga do contexto, para não desfazer o que a página gravar depois
      if (!sessionStorage.getItem("e2e-seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("e2e-seeded", "1");
      }
    },
    [CART_KEY, JSON.stringify(items)] as const,
  );
}

test.beforeEach(async ({ page }) => {
  await blockPayments(page);
});

test("home carrega sem erro de console e sem rolagem horizontal", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("link", { name: /página inicial/i })).toBeVisible();
  await page.waitForLoadState("load");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "rolagem horizontal na home").toBeLessThanOrEqual(0);
  expect(errors, "erros de console").toEqual([]);
});

test("menu tem Chuteiras, Tênis, Air Max TN e Mizuno", async ({ page, isMobile }) => {
  await page.goto("/");
  let menu;
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    menu = page.getByRole("complementary", { name: "Menu" });
  } else {
    menu = page.getByRole("navigation", { name: "Menu principal" });
  }
  for (const label of ["Chuteiras", "Tênis", "Air Max TN", "Mizuno"]) {
    await expect(menu.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
  }
});

test("página de produto abre", async ({ page }) => {
  await page.goto(`/produtos/${PRODUCT_SLUG}`);
  await expect(page.getByRole("heading", { level: 1, name: /Adizero Pro 4/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
});

test("checkout: CEP 01310-100 preenche Avenida Paulista e mostra frete (rede mockada)", async ({ page }) => {
  await page.route("https://viacep.com.br/**", (r) =>
    r.fulfill({
      json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" },
    }),
  );
  await page.route("**/api/frete", (r) =>
    r.fulfill({ json: { options: [{ id: 1, name: "PAC", price: 25.9, days: 5 }] } }),
  );
  await seedCart(page);

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Finalizar compra" })).toBeVisible();
  // Checkout em passos: Contato antes de Entrega
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("teste@exemplo.com");
  await page.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Teste Silva");
  await page.getByRole("textbox", { name: "WhatsApp", exact: true }).fill("11987654321");
  await page.getByRole("button", { name: "Continuar para entrega" }).click();
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01310100");

  await expect(page.getByRole("textbox", { name: "Rua", exact: true })).toHaveValue("Avenida Paulista");
  await expect(page.getByRole("textbox", { name: "Bairro", exact: true })).toHaveValue("Bela Vista");
  await expect(page.getByText("PAC")).toBeVisible();
});

test("/pedido/sucesso limpa o carrinho", async ({ page }) => {
  await seedCart(page);
  await page.goto("/pedido/sucesso");
  await expect(page.getByRole("heading", { name: /Pagamento aprovado/ })).toBeVisible();
  await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), CART_KEY)).toBe("[]");
  await expect(page.getByRole("button", { name: "Carrinho com 0 itens" })).toBeVisible();
});
