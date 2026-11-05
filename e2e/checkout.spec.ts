import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Aceitação da rodada "promessas honestas + checkout em 3 passos" (commits e075ad0 e 003126a).
 * Rede externa sempre mockada: ViaCEP, /api/frete e /api/checkout. Mercado Pago bloqueado.
 */

const CART_KEY = "breck-cart";
const SLUG = "adizero-pro-4-brown-and-black";
const CART = [{ slug: SLUG, size: "38", quantity: 1 }];
const FORBIDDEN = [/frete gr[aá]tis/i, /sudeste/i, /5\s?% ?off/i, /R\$[^\n]{0,30}\b(com|no) pix\b/i, /\b(com|no) pix\b[^\n]{0,20}R\$/i];

/** Mesmo formato do site: "R$349,00" (sem espaço). */
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n).replace(/\s/g, "");
const norm = (s: string) => s.replace(/ /g, " ");
const parseBrl = (s: string) => Number(norm(s).replace(/[^\d,]/g, "").replace(",", "."));

/** Erros de console coletados por teste; `allow` filtra os provocados de propósito pelo mock. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return (allow: RegExp[] = []) => errors.filter((e) => !allow.some((a) => a.test(e)));
}

async function seedCart(page: Page, items: unknown[] = CART) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem("e2e-seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("e2e-seeded", "1");
      }
    },
    [CART_KEY, JSON.stringify(items)] as const,
  );
}

async function mockNetwork(page: Page, opts: { freteFail?: boolean } = {}) {
  await page.route(/mercadopago|mercadolibre|mlstatic/, (r) => r.abort());
  // SDK do Payment Brick vazio: estes testes cobrem o fallback (Checkout Pro); o Brick tem spec própria
  await page.route("https://sdk.mercadopago.com/js/v2", (r) => r.fulfill({ contentType: "application/javascript", body: "/* sem SDK no e2e */" }));
  await page.route("https://viacep.com.br/**", (r) =>
    r.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  let freteCalls = 0;
  await page.route("**/api/frete", (r) => {
    freteCalls++;
    if (opts.freteFail && freteCalls === 1) return r.fulfill({ status: 500, json: { error: "Não conseguimos calcular o frete agora." } });
    return r.fulfill({
      json: {
        options: [
          { id: 1, name: "PAC", price: 25.9, days: 5 },
          { id: 2, name: "SEDEX", price: 40, days: 2 },
        ],
      },
    });
  });
}

async function fillContato(page: Page) {
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("teste@exemplo.com");
  await page.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Teste Silva");
  await page.getByRole("textbox", { name: "WhatsApp", exact: true }).fill("11987654321");
  await page.getByRole("button", { name: "Continuar para entrega" }).click();
}

async function fillEntrega(page: Page) {
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01310100");
  await expect(page.getByRole("textbox", { name: "Rua", exact: true })).toHaveValue("Avenida Paulista");
  await page.getByRole("textbox", { name: "Número", exact: true }).fill("1000");
  await expect(page.getByText("PAC", { exact: true })).toBeVisible();
}

const visiblePay = (page: Page) => page.getByRole("button", { name: /^Pagar R\$.* no Mercado Pago$/ }).filter({ visible: true }).first();

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "rolagem horizontal").toBeLessThanOrEqual(0);
}

/** true se o elemento está coberto (o ponto central pertence a outro elemento). */
async function isCovered(page: Page, loc: ReturnType<Page["locator"]>) {
  await loc.scrollIntoViewIfNeeded();
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const pts = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 4, r.bottom - 4],
      [r.right - 4, r.bottom - 4],
    ];
    return pts.some(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return !hit || !(el === hit || el.contains(hit));
    });
  });
}

// 1 ------------------------------------------------------------------------------------------
test.describe("1. Nenhuma promessa falsa", () => {
  test("home, card, produto, quick shop, carrinho e checkout sem frete grátis/Sudeste/5% OFF/preço com Pix", async ({ page, isMobile }) => {
    const errs = watchConsole(page);
    await mockNetwork(page);
    await seedCart(page);
    const check = async (where: string) => {
      const text = norm(await page.locator("body").innerText());
      for (const re of FORBIDDEN) expect(text, `${where}: ${re}`).not.toMatch(re);
    };

    await page.goto("/");
    // A faixa de anúncios (AnnouncementBar) não está ligada no layout: o critério vale só se ela aparecer
    const bar = page.getByRole("region", { name: "Avisos da loja" });
    if (await bar.count()) await expect.soft(bar, "faixa de anúncio").toContainText(/Enviamos para todo o Brasil/i);
    await check("home (com cards)");

    const quick = page.getByRole("button", { name: /^Compra rápida de / }).first();
    await quick.scrollIntoViewIfNeeded();
    await quick.click({ force: isMobile });
    await expect(page.getByRole("dialog", { name: /Compra rápida de/ })).toBeVisible();
    const dialogText = norm(await page.getByRole("dialog", { name: /Compra rápida de/ }).innerText());
    for (const re of FORBIDDEN) expect(dialogText, `quick shop: ${re}`).not.toMatch(re);
    await page.getByRole("button", { name: "Fechar" }).first().click();

    await page.goto(`/produtos/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await check("produto");

    await page.getByRole("button", { name: /Carrinho com/ }).first().click();
    await expect(page.getByText(/Adizero Pro 4/).first()).toBeVisible();
    await check("carrinho");

    await page.goto("/checkout");
    await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toBeVisible();
    await check("checkout");
    expect(errs()).toEqual([]);
  });
});

// 2 ------------------------------------------------------------------------------------------
test.describe("2. Sem login/cadastro falso", () => {
  test("header e menu sem Cadastre-se/Fazer login", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("banner")).not.toContainText(/Cadastre-se|Fazer login/i);
    if (isMobile) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      const menu = page.getByRole("complementary", { name: "Menu" });
      await expect(menu.getByRole("link", { name: "Chuteiras", exact: true }).first()).toBeVisible();
      await expect(menu).not.toContainText(/Cadastre-se|Fazer login/i);
    }
    await expect(page.getByRole("link", { name: /Cadastre-se|Fazer login/i })).toHaveCount(0);
  });

  for (const path of ["/conta/login", "/conta/cadastro"]) {
    test(`${path} redireciona para /`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

// 3 + 8 --------------------------------------------------------------------------------------
test.describe("3. Checkout em 3 passos", () => {
  test("passos, rótulos, erro no campo, CEP, total com frete e pagamento com contrato", async ({ page, baseURL }) => {
    const errs = watchConsole(page);
    await mockNetwork(page);
    await seedCart(page);
    const bodies: unknown[] = [];
    await page.route("**/api/checkout", async (r: Route) => {
      bodies.push(r.request().postDataJSON());
      await r.fulfill({ json: { url: `${baseURL}/pedido/sucesso?external_reference=E2E-123` } });
    });

    await page.goto("/checkout");
    const stepper = page.getByRole("list", { name: "Etapas da compra" });
    await expect(stepper.getByRole("listitem")).toHaveText([/Contato/, /Entrega/, /Pagamento/]);

    // erro junto ao campo (contato vazio)
    await page.getByRole("button", { name: "Continuar para entrega" }).click();
    await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveAttribute("aria-invalid", "true");

    for (const l of ["E-mail", "Nome completo", "WhatsApp"]) await expect(page.locator("label", { hasText: l }).first()).toBeVisible();
    await fillContato(page);

    for (const l of ["CEP"]) await expect(page.locator("label", { hasText: l }).first()).toBeVisible();
    await fillEntrega(page);
    await expect(page.getByRole("textbox", { name: "Bairro", exact: true })).toHaveValue("Bela Vista");
    for (const l of ["Rua", "Número", "Complemento", "Bairro"]) await expect(page.locator("label", { hasText: l }).first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^(UF|Estado)$/ })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^(UF|Estado)$/ })).toHaveCount(0);

    // total atualiza com o frete escolhido
    const subtotal = parseBrl(await page.getByText("Subtotal", { exact: true }).locator("xpath=following-sibling::dd[1]").innerText());
    expect(subtotal).toBeGreaterThan(0);
    await page.getByRole("radio", { name: /SEDEX/ }).check();
    await expect(page.getByText("Frete", { exact: true }).locator("xpath=following-sibling::dd[1]")).toHaveText(brl(40));
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();

    // CPF inválido
    const cpf = page.getByRole("textbox", { name: "CPF", exact: true });
    await cpf.fill("111.111.111-11");
    await cpf.blur();
    await expect(page.getByText("Esse CPF não existe. Confira os números.")).toBeVisible();
    await expect(cpf).toHaveAttribute("aria-invalid", "true");
    await cpf.fill("529.982.247-25");

    const total = subtotal + 40;
    const pay = visiblePay(page);
    await expect.poll(async () => norm((await pay.textContent()) ?? "").trim()).toBe(`Pagar ${brl(total)} no Mercado Pago`);
    await pay.click();
    await expect(page).toHaveURL(/\/pedido\/sucesso\?external_reference=E2E-123/);

    expect(bodies).toHaveLength(1);
    const b = bodies[0] as { items: unknown; customer: Record<string, string>; shippingId: number };
    expect(b.items).toEqual(CART);
    expect(b.shippingId).toBe(2);
    expect(b.customer).toMatchObject({
      name: "Teste Silva",
      email: "teste@exemplo.com",
      cep: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      cpf: "529.982.247-25",
    });
    expect(b.customer.phone).toMatch(/11.*98765.*4321/);
    expect(errs()).toEqual([]);
  });

  test("frete com erro oferece Tentar de novo e Combinar pelo WhatsApp", async ({ page }) => {
    const errs = watchConsole(page);
    await mockNetwork(page, { freteFail: true });
    await seedCart(page);
    await page.goto("/checkout");
    await fillContato(page);
    await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01310100");
    const alert = page.getByRole("alert").filter({ hasText: "frete" });
    await expect(alert.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "Combinar pelo WhatsApp" })).toBeVisible();
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByText("PAC", { exact: true })).toBeVisible();
    expect(errs([/status of 500/])).toEqual([]);
  });

  test("8. duplo clique em pagar: no máximo 1 navegação e sem erro", async ({ page, baseURL }) => {
    const errs = watchConsole(page);
    await mockNetwork(page);
    await seedCart(page);
    let calls = 0;
    await page.route("**/api/checkout", async (r) => {
      calls++;
      await new Promise((res) => setTimeout(res, 400)); // resposta lenta para o 2º clique cair no meio
      await r.fulfill({ json: { url: `${baseURL}/pedido/sucesso?external_reference=E2E-DUP` } });
    });
    const navs: string[] = [];
    // conta carregamentos de documento (framenavigated também dispara em mudanças de histórico na mesma página)
    page.on("request", (r) => r.isNavigationRequest() && /pedido\/sucesso/.test(r.url()) && navs.push(r.url()));

    await page.goto("/checkout");
    await fillContato(page);
    await fillEntrega(page);
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();
    await page.getByRole("textbox", { name: "CPF", exact: true }).fill("529.982.247-25");
    await visiblePay(page).dblclick();
    await expect(page).toHaveURL(/pedido\/sucesso/);
    await expect(page.getByRole("heading", { name: /Pagamento aprovado/ })).toBeVisible();
    expect(navs.length, `navegações: ${navs.join(" | ")}; chamadas: ${calls}`).toBeLessThanOrEqual(1);
    expect.soft(calls, "chamadas a /api/checkout").toBeLessThanOrEqual(1);
    expect(errs()).toEqual([]);
  });
});

// 4 ------------------------------------------------------------------------------------------
test.describe("4. Checkout no celular", () => {
  test("barra fixa com total e botão, Ver resumo recolhível, sem rolagem horizontal", async ({ page, isMobile }) => {
    test.skip(!isMobile, "critério só de mobile");
    await mockNetwork(page);
    await seedCart(page);
    await page.goto("/checkout");

    const barBtn = page.getByRole("button", { name: "Continuar", exact: true });
    await expect(barBtn).toBeVisible();
    const vh = page.viewportSize()!.height;
    const pos = await barBtn.evaluate((el) => getComputedStyle(el.parentElement!).position);
    expect(pos).toBe("fixed");
    expect((await barBtn.boundingBox())!.y + 10).toBeGreaterThan(vh - 120);
    await expect(barBtn.locator("xpath=..")).toContainText(/Total\s*R\$/);

    const toggle = page.getByRole("button", { name: /Ver resumo/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("complementary", { name: "Resumo do pedido" })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole("button", { name: /Esconder resumo/ })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("complementary", { name: "Resumo do pedido" })).toBeVisible();
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: /Esconder resumo/ }).click();

    await fillContato(page);
    await fillEntrega(page);
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "CPF", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar no Mercado Pago", exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("checkout-mobile-pagamento.png"), fullPage: false });
    await noHorizontalScroll(page);
  });
});

// 5 ------------------------------------------------------------------------------------------
test.describe("5. Cookie banner discreto", () => {
  test("não cobre seletor de tamanho nem botão de compra no produto", async ({ page }) => {
    await page.goto(`/produtos/${SLUG}`);
    await expect(page.getByRole("region", { name: "Aviso de cookies" })).toBeVisible();
    const sizes = page.getByRole("group", { name: /Tamanho/ });
    for (const b of await sizes.getByRole("button").all()) expect(await isCovered(page, b), `tamanho ${await b.innerText()}`).toBe(false);
    expect(await isCovered(page, page.getByRole("button", { name: "Adicionar ao carrinho" })), "Adicionar ao carrinho").toBe(false);
    await page.screenshot({ path: test.info().outputPath("produto-cookie.png") });
  });

  test("não aparece no checkout e não cobre o pagar", async ({ page }) => {
    await mockNetwork(page);
    await seedCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Aviso de cookies" })).toHaveCount(0);
    await fillContato(page);
    await fillEntrega(page);
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();
    expect(await isCovered(page, visiblePay(page))).toBe(false);
  });
});

// 6 ------------------------------------------------------------------------------------------
test.describe("6. Rodapé", () => {
  test("rodapé com endereço, Instagram e Privacidade/Trocas/Termos", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(/Feirinha da Madrugada/);
    await expect(footer.getByRole("link", { name: /instagram/i }).first()).toBeVisible();
    const pol = footer.getByRole("navigation", { name: "Políticas" });
    for (const name of [/Privacidade/, /Trocas/, /Termos/]) await expect(pol.getByRole("link", { name })).toBeVisible();
  });

  for (const path of ["/pagina/termos-e-condicoes-de-uso", "/pedido/erro", "/rota-que-nao-existe"]) {
    test(`página curta ${path} sem vão grande antes do rodapé`, async ({ page }) => {
      await page.goto(path);
      const footer = page.getByRole("contentinfo");
      await expect(footer).toBeAttached();
      const gap = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        const bottoms = Array.from(main.querySelectorAll("*")).map((e) => e.getBoundingClientRect().bottom);
        const contentBottom = Math.max(...bottoms);
        return document.querySelector("footer")!.getBoundingClientRect().top - contentBottom;
      });
      await page.screenshot({ path: test.info().outputPath("pagina-curta.png"), fullPage: true });
      expect(gap, "vão entre conteúdo e rodapé (px)").toBeLessThan(260);
    });
  }
});

// 7 ------------------------------------------------------------------------------------------
test.describe("7. Volta do pagamento", () => {
  test("/pedido/sucesso mostra mensagem e limpa o carrinho", async ({ page }) => {
    await seedCart(page);
    await page.goto("/pedido/sucesso?external_reference=E2E-1");
    await expect(page.getByRole("heading", { name: /Pagamento aprovado/ })).toBeVisible();
    await expect(page.getByText(/Pedido nº/)).toContainText("E2E-1");
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), CART_KEY)).toBe("[]");
  });

  test("/pedido/erro oferece tentar de novo e mantém o carrinho", async ({ page }) => {
    await seedCart(page);
    await page.goto("/pedido/erro");
    await expect(page.getByRole("heading", { name: /não concluído/ })).toBeVisible();
    await page.getByRole("link", { name: "Tentar de novo" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toBeVisible();
  });
});
