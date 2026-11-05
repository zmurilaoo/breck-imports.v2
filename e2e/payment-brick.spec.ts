import { expect, test, type Page } from "@playwright/test";

/**
 * Pagamento transparente (Payment Brick). O SDK do Mercado Pago é trocado por um falso que só chama
 * onSubmit com o formData; /api/pay e /api/pay-status são mockados. Nada é cobrado, nada sai para a rede.
 */

const CART = [{ slug: "adizero-pro-4-brown-and-black", size: "38", quantity: 1 }];

const FAKE_SDK = `
window.MercadoPago = function () {
  return { bricks: function () { return { create: async function (type, id, settings) {
    window.__brickSettings = settings;
    var el = document.getElementById(id);
    el.innerHTML = '<button type="button" id="fake-pix">Pagar com Pix (falso)</button><button type="button" id="fake-card">Pagar com cartão (falso)</button><button type="button" id="fake-boleto">Pagar com boleto (falso)</button>';
    var amount = settings.initialization.amount;
    var go = function (fd) { return function () { settings.callbacks.onSubmit({ selectedPaymentMethod: "x", formData: Object.assign({ transaction_amount: amount }, fd) }); }; };
    el.querySelector("#fake-pix").onclick = go({ payment_method_id: "pix" });
    el.querySelector("#fake-card").onclick = go({ payment_method_id: "visa", token: "tok-e2e", installments: 3, issuer_id: "25" });
    el.querySelector("#fake-boleto").onclick = go({ payment_method_id: "bolbradesco" });
    setTimeout(function () { settings.callbacks.onReady(); }, 50);
    return { unmount: function () { el.innerHTML = ""; } };
  } }; } };
};`;

async function setup(page: Page, opts: { sdk?: "fake" | "blocked" } = {}) {
  await page.addInitScript((cart) => {
    if (!sessionStorage.getItem("e2e-seeded")) {
      localStorage.setItem("breck-cart", cart);
      sessionStorage.setItem("e2e-seeded", "1");
    }
  }, JSON.stringify(CART));
  await page.route(/mercadopago|mercadolibre|mlstatic/, (r) =>
    opts.sdk !== "blocked" && r.request().url().startsWith("https://sdk.mercadopago.com/js/v2")
      ? r.fulfill({ contentType: "application/javascript", body: FAKE_SDK })
      : r.abort(),
  );
  await page.route("https://viacep.com.br/**", (r) =>
    r.fulfill({ json: { cep: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" } }),
  );
  await page.route("**/api/frete", (r) => r.fulfill({ json: { options: [{ id: 1, name: "PAC", price: 25.9, days: 5 }] } }));
}

async function toPayment(page: Page) {
  await page.goto("/checkout");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("teste@exemplo.com");
  await page.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Teste Silva");
  await page.getByRole("textbox", { name: "WhatsApp", exact: true }).fill("11987654321");
  await page.getByRole("button", { name: "Continuar para entrega" }).click();
  await page.getByRole("textbox", { name: "CEP", exact: true }).fill("01310100");
  await expect(page.getByRole("textbox", { name: "Rua", exact: true })).toHaveValue("Avenida Paulista");
  await page.getByRole("textbox", { name: "Número", exact: true }).fill("1000");
  await expect(page.getByText("PAC", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar para pagamento" }).click();
  await page.getByRole("textbox", { name: "CPF", exact: true }).fill("529.982.247-25");
}

test.describe("Pagamento transparente (Payment Brick)", () => {
  test("Brick no passo 3, sem conta Mercado Pago, cartão aprovado vai para sucesso", async ({ page }) => {
    await setup(page);
    let body: Record<string, unknown> | null = null;
    await page.route("**/api/pay", async (r) => {
      body = r.request().postDataJSON();
      await r.fulfill({ json: { status: "approved", statusDetail: "accredited", paymentId: "1", reference: "BRK-E2E-1" } });
    });
    await toPayment(page);
    await expect(page.locator("#fake-card")).toBeVisible();
    const settings = await page.evaluate(() => (window as unknown as { __brickSettings: { customization: { paymentMethods: Record<string, unknown> } } }).__brickSettings);
    expect(settings.customization.paymentMethods.mercadoPago, "sem login/conta Mercado Pago").toBeUndefined();
    expect(settings.customization.paymentMethods.maxInstallments).toBe(12);
    await expect(page.getByRole("button", { name: /no Mercado Pago/ })).toHaveCount(0);
    await page.locator("#fake-card").click();
    await expect(page).toHaveURL(/\/pedido\/sucesso\?external_reference=BRK-E2E-1/);
    expect(body!.shippingId).toBe(1);
    expect((body!.formData as Record<string, unknown>).token).toBe("tok-e2e");
    expect(JSON.stringify(body)).not.toMatch(/card_number|security_code|cvv/i);
  });

  test("Pix mostra QR, copia e cola e vira sucesso sozinho", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await setup(page);
    await page.route("**/api/pay", (r) =>
      r.fulfill({
        json: {
          status: "pending", statusDetail: "pending_waiting_transfer", paymentId: "222", reference: "BRK-E2E-PIX",
          pix: { qrCode: "00020126PIXE2E", qrCodeBase64: "iVBORw0KGgo=", ticketUrl: "", expiresAt: new Date(Date.now() + 30 * 60000).toISOString() },
        },
      }),
    );
    let polls = 0;
    await page.route("**/api/pay-status?id=222", (r) => r.fulfill({ json: { status: ++polls >= 2 ? "approved" : "pending", statusDetail: "" } }));
    await toPayment(page);
    await page.locator("#fake-pix").click();
    await expect(page.getByRole("img", { name: "QR code do Pix" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Pix copia e cola" })).toHaveValue("00020126PIXE2E");
    await expect(page.getByText(/Aguardando pagamento/)).toBeVisible();
    await expect(page.getByText(/expira em \d\d:\d\d/)).toBeVisible();
    await page.getByRole("button", { name: "Copiar código Pix" }).click();
    await expect(page.getByRole("button", { name: "Código copiado!" })).toBeVisible();
    await expect(page).toHaveURL(/\/pedido\/sucesso\?external_reference=BRK-E2E-PIX/, { timeout: 15_000 });
  });

  test("boleto mostra abrir e copiar linha digitável", async ({ page }) => {
    await setup(page);
    await page.route("**/api/pay", (r) =>
      r.fulfill({ json: { status: "pending", statusDetail: "pending_waiting_payment", paymentId: "333", reference: "BRK-E2E-BOL", boleto: { url: "https://example.com/boleto", barcode: "23790000", expiresAt: null } } }),
    );
    await toPayment(page);
    await page.locator("#fake-boleto").click();
    await expect(page.getByRole("link", { name: "Abrir boleto" })).toHaveAttribute("href", "https://example.com/boleto");
    await expect(page.getByRole("button", { name: "Copiar linha digitável" })).toBeVisible();
    await page.getByRole("button", { name: "Já salvei o boleto" }).click();
    await expect(page).toHaveURL(/\/pedido\/pendente/);
  });

  test("cartão recusado mostra mensagem amigável e permite tentar de novo", async ({ page }) => {
    await setup(page);
    await page.route("**/api/pay", (r) =>
      r.fulfill({ json: { status: "rejected", statusDetail: "cc_rejected_insufficient_amount", paymentId: "4", reference: "BRK-E2E-R", message: "O cartão não tem limite suficiente. Tente outro cartão ou o Pix." } }),
    );
    await toPayment(page);
    await page.locator("#fake-card").click();
    await expect(page.getByRole("alert")).toHaveText(/limite suficiente/);
    await expect(page.locator("#fake-card")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("SDK bloqueado: cai no Checkout Pro (Pagar no Mercado Pago)", async ({ page }) => {
    await setup(page, { sdk: "blocked" });
    await toPayment(page);
    await expect(page.getByRole("button", { name: /^Pagar R\$.* no Mercado Pago$/ }).filter({ visible: true }).first()).toBeVisible();
  });
});
