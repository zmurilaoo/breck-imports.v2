// Testes das funções empacotadas em api/*.js com fetch mockado (nada sai para a rede, nada é cobrado).
// Rodar depois de `npm run build:api`: node scripts/test-api.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

Object.assign(process.env, {
  MP_ACCESS_TOKEN: "TEST-token",
  MP_WEBHOOK_SECRET: "segredo-teste",
  KV_REST_API_URL: "https://redis.mock",
  KV_REST_API_TOKEN: "x",
  RESEND_API_KEY: "re_test",
  LOJA_EMAIL_REMETENTE: "Breck <pedidos@breck.test>",
  SUPERFRETE_TOKEN: "sf",
  SUPERFRETE_CEP_ORIGEM: "01001000",
  SUPERFRETE_AUTO_PAY: "true",
  SUPERFRETE_REMETENTE_NOME: "Breck",
  SUPERFRETE_REMETENTE_ENDERECO: "Rua A",
  SUPERFRETE_REMETENTE_BAIRRO: "Centro",
  SUPERFRETE_REMETENTE_CIDADE: "São Paulo",
  SUPERFRETE_REMETENTE_UF: "SP",
});

const db = new Map();
const calls = [];
let mpPayment = null; // resposta de POST /v1/payments
const mpPayments = new Map(); // GET /v1/payments/:id

function redisCmd([cmd, key, ...rest]) {
  if (cmd === "GET") return db.get(key) ?? null;
  if (cmd === "DEL") return db.delete(key) ? 1 : 0;
  if (cmd === "SET") {
    if (rest.includes("NX") && db.has(key)) return null;
    db.set(key, rest[0]);
    return "OK";
  }
  if (cmd === "INCR") { const v = Number(db.get(key) ?? 0) + 1; db.set(key, String(v)); return v; }
  if (cmd === "EXPIRE") return 1;
  throw new Error("cmd " + cmd);
}

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ url, method: init.method ?? "GET", body, headers: init.headers });
  const ok = (data) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://redis.mock")) return ok({ result: redisCmd(body) });
  if (url.endsWith("/api/v0/calculator")) return ok([{ id: 1, name: "PAC", price: 25.9, delivery_time: 5 }]);
  if (url.endsWith("/api/v0/cart")) return ok({ id: "sf-1", price: 25.9, status: "pending" });
  if (url.endsWith("/api/v0/checkout")) return ok({ success: true, purchase: { orders: [{ id: "sf-1", tracking: "AA123BR" }] } });
  if (url === "https://api.mercadopago.com/v1/payments" && init.method === "POST") return ok({ ...mpPayment(body) });
  const m = url.match(/\/v1\/payments\/(\d+)$/);
  if (m) return ok(mpPayments.get(m[1]));
  if (url === "https://api.resend.com/emails") return ok({ id: "email-1" });
  throw new Error("fetch não mockado: " + url);
};

const { POST: pay } = await import("../api/pay.js");
const { GET: payStatus } = await import("../api/pay-status.js");
const { POST: webhook } = await import("../api/mp-webhook.js");

const customer = {
  name: "Teste Silva", email: "comprador@teste.com", phone: "11987654321", cpf: "191.191.191-00",
  cep: "01310-100", street: "Avenida Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP",
};
const items = [{ slug: "adizero-pro-4-brown-and-black", size: "38", quantity: 1 }];
const req = (formData) =>
  new Request("http://x/api/pay", { method: "POST", body: JSON.stringify({ formData, items, customer, shippingId: 1 }) });
const mpPosts = () => calls.filter((c) => c.url === "https://api.mercadopago.com/v1/payments");
let n = 0;
const test = async (name, fn) => {
  await fn();
  n++;
  console.log("ok -", name);
};


await test("cartão aprovado: valor recalculado no servidor, token repassado, sem dado de cartão", async () => {
  mpPayment = (b) => ({ id: 111, status: "approved", status_detail: "accredited", payment_method_id: "visa", payment_type_id: "credit_card", external_reference: b.external_reference });
  const first = await pay(req({ payment_method_id: "visa", token: "tok1", installments: 3, issuer_id: 25 }));
  const d = await first.json();
  assert.equal(first.status, 200);
  assert.equal(d.status, "approved");
  assert.match(d.reference, /^BRK-/);
  const sent = mpPosts().at(-1);
  assert.equal(sent.body.token, "tok1");
  assert.equal(sent.body.installments, 3);
  assert.ok(sent.body.transaction_amount > 25.9, "total inclui produto + frete");
  assert.ok(sent.headers["X-Idempotency-Key"]?.length === 64);
  assert.equal(sent.body.payer.identification.number, "19119119100");
  assert.ok(db.has(`brk:pedido:${d.reference}`), "pedido gravado para a etiqueta");
});

await test("valor adulterado no navegador é recusado com 409", async () => {
  const r = await pay(req({ payment_method_id: "visa", token: "tok9", installments: 1, transaction_amount: 1 }));
  assert.equal(r.status, 409);
});

await test("idempotência: mesmo submit não cria segundo pagamento", async () => {
  const before = mpPosts().length;
  const r = await pay(req({ payment_method_id: "visa", token: "tok1", installments: 3, issuer_id: 25 }));
  assert.equal((await r.json()).paymentId, "111");
  assert.equal(mpPosts().length, before);
});

await test("Pix pendente devolve QR, copia e cola e expiração", async () => {
  mpPayment = (b) => ({
    id: 222, status: "pending", status_detail: "pending_waiting_transfer", payment_method_id: "pix", payment_type_id: "bank_transfer",
    date_of_expiration: b.date_of_expiration, external_reference: b.external_reference,
    point_of_interaction: { transaction_data: { qr_code: "00020126PIX", qr_code_base64: "iVBORw0", ticket_url: "https://mp/ticket" } },
  });
  const d = await (await pay(req({ payment_method_id: "pix" }))).json();
  assert.equal(d.status, "pending");
  assert.equal(d.pix.qrCode, "00020126PIX");
  assert.equal(d.pix.qrCodeBase64, "iVBORw0");
  assert.match(d.pix.expiresAt, /-03:00$/);
  assert.equal(mpPosts().at(-1).body.token, undefined);
});

await test("boleto leva endereço do pagador e devolve link", async () => {
  mpPayment = (b) => ({ id: 333, status: "pending", status_detail: "pending_waiting_payment", payment_method_id: "bolbradesco", payment_type_id: "ticket",
    transaction_details: { external_resource_url: "https://mp/boleto" }, barcode: { content: "2379000" }, external_reference: b.external_reference });
  const d = await (await pay(req({ payment_method_id: "bolbradesco" }))).json();
  assert.equal(d.boleto.url, "https://mp/boleto");
  assert.equal(d.boleto.barcode, "2379000");
  assert.equal(mpPosts().at(-1).body.payer.address.zip_code, "01310100");
});

await test("cartão recusado: mensagem amigável por status_detail e pedido não gravado", async () => {
  mpPayment = (b) => ({ id: 444, status: "rejected", status_detail: "cc_rejected_insufficient_amount", payment_method_id: "master", payment_type_id: "credit_card", external_reference: b.external_reference });
  const d = await (await pay(req({ payment_method_id: "master", token: "tok-recusado", installments: 1 }))).json();
  assert.equal(d.status, "rejected");
  assert.match(d.message, /limite/);
});

await test("pay-status lê do Mercado Pago e valida o id", async () => {
  mpPayments.set("222", { id: 222, status: "approved", status_detail: "accredited", payer: { email: "nao-vaza@x" } });
  const d = await (await payStatus(new Request("http://x/api/pay-status?id=222"))).json();
  assert.deepEqual(d, { status: "approved", statusDetail: "accredited" });
  assert.equal((await payStatus(new Request("http://x/api/pay-status?id=abc"))).status, 400);
});

const sign = (id) => {
  const ts = "1700000000";
  const v1 = createHmac("sha256", "segredo-teste").update(`id:${id};request-id:rq-1;ts:${ts};`).digest("hex");
  return { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": "rq-1" };
};

await test("webhook payment aprovado: etiqueta + e-mail confirmado + e-mail enviado, uma vez só", async () => {
  // Pagamento Pix 222 aprovado (o pedido foi gravado no teste do Pix)
  const ref = (await (await pay(req({ payment_method_id: "pix" }))).json()).reference;
  const total = JSON.parse(db.get(`brk:pedido:${ref}`) ?? "{}").total;
  mpPayments.set("222", { id: 222, status: "approved", status_detail: "accredited", external_reference: ref, transaction_amount: total });
  const hook = () => webhook(new Request("http://x/api/mp-webhook?data.id=222&type=payment", {
    method: "POST", headers: sign("222"), body: JSON.stringify({ type: "payment", action: "payment.updated", data: { id: "222" } }),
  }));
  const r1 = await (await hook()).json();
  assert.equal(r1.paid, true);
  assert.equal(r1.shipment, "sf-1");
  assert.equal(r1.emails.confirmado, "sent");
  assert.equal(r1.emails.enviado, "sent");
  const r2 = await (await hook()).json();
  assert.equal(r2.emails.confirmado, "duplicate");
  assert.equal(r2.emails.enviado, "duplicate");
  const emails = calls.filter((c) => c.url === "https://api.resend.com/emails");
  assert.equal(emails.length, 2, "dois e-mails no total, nunca repetidos");
  assert.equal(calls.filter((c) => c.url.endsWith("/api/v0/cart")).length, 1, "etiqueta criada uma vez");
  assert.match(emails[1].body.html, /AA123BR/);
  assert.equal(emails[0].body.to[0], "comprador@teste.com");
});

await test("webhook com assinatura inválida é recusado", async () => {
  const r = await webhook(new Request("http://x/api/mp-webhook?data.id=222&type=payment", {
    method: "POST", headers: { "x-signature": "ts=1,v1=00", "x-request-id": "rq" }, body: JSON.stringify({ type: "payment", data: { id: "222" } }),
  }));
  assert.equal(r.status, 401);
});

await test("webhook payment pendente não gera etiqueta nem e-mail", async () => {
  mpPayments.set("555", { id: 555, status: "pending", status_detail: "pending_waiting_transfer", external_reference: "BRK-X" });
  const r = await (await webhook(new Request("http://x/api/mp-webhook?data.id=555&type=payment", {
    method: "POST", headers: sign("555"), body: JSON.stringify({ type: "payment", data: { id: "555" } }),
  }))).json();
  assert.equal(r.paid, false);
});

await test("webhook: pagamento aprovado com valor menor que o pedido não libera etiqueta", async () => {
  mpPayment = (b) => ({ id: 666, status: "pending", status_detail: "pending_waiting_transfer", payment_method_id: "pix", payment_type_id: "bank_transfer", external_reference: b.external_reference });
  for (const k of [...db.keys()]) if (k.startsWith("brk:pay-idem:") || k.startsWith("brk:envio") || k.startsWith("brk:email")) db.delete(k);
  const ref = (await (await pay(req({ payment_method_id: "pix" }))).json()).reference;
  mpPayments.set("666", { id: 666, status: "approved", status_detail: "accredited", external_reference: ref, transaction_amount: 1 });
  const before = calls.filter((c) => c.url.endsWith("/api/v0/cart")).length;
  const r = await (await webhook(new Request("http://x/api/mp-webhook?data.id=666&type=payment", {
    method: "POST", headers: sign("666"), body: JSON.stringify({ type: "payment", data: { id: "666" } }),
  }))).json();
  assert.equal(r.skipped, "valor pago diverge do pedido");
  assert.equal(calls.filter((c) => c.url.endsWith("/api/v0/cart")).length, before);
});

await test("cartão: limite de tentativas por IP devolve 429 (anti card testing)", async () => {
  mpPayment = (b) => ({ id: 777, status: "rejected", status_detail: "cc_rejected_other_reason", payment_method_id: "visa", payment_type_id: "credit_card", external_reference: b.external_reference });
  const r = (i) => new Request("http://x/api/pay", { method: "POST", headers: { "x-real-ip": "203.0.113.9" },
    body: JSON.stringify({ formData: { payment_method_id: "visa", token: "rl" + i }, items, customer, shippingId: 1 }) });
  const codes = [];
  for (let i = 0; i < 10; i++) codes.push((await pay(r(i))).status);
  assert.deepEqual(codes.slice(0, 8), Array(8).fill(200));
  assert.equal(codes[8], 429);
  const pix = await pay(new Request("http://x/api/pay", { method: "POST", headers: { "x-real-ip": "203.0.113.9" },
    body: JSON.stringify({ formData: { payment_method_id: "pix" }, items, customer, shippingId: 1 }) }));
  assert.notEqual(pix.status, 429, "Pix não entra no limite de cartão");
});

console.log(`\n${n} testes passaram`);
