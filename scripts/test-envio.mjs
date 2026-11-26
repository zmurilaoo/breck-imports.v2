// Testes do POST /api/admin-order (envio na SuperFrete pelo dash) com Redis, Mercado Pago e SuperFrete mockados. Nada sai para a rede.
// Rodar depois de `npm run build:api`: node scripts/test-envio.mjs
import assert from "node:assert/strict";

const TOKEN = "tok-admin-teste-123-0123456789abcdef";
Object.assign(process.env, {
  ADMIN_API_TOKEN: TOKEN, MP_ACCESS_TOKEN: "TEST-token", KV_REST_API_URL: "https://redis.mock", KV_REST_API_TOKEN: "x",
  SUPERFRETE_TOKEN: "sf-teste", SUPERFRETE_CEP_ORIGEM: "01001000", SUPERFRETE_REMETENTE_NOME: "Loja", SUPERFRETE_REMETENTE_ENDERECO: "Rua A",
  SUPERFRETE_REMETENTE_BAIRRO: "Centro", SUPERFRETE_REMETENTE_CIDADE: "São Paulo", SUPERFRETE_REMETENTE_UF: "SP", SUPERFRETE_AUTO_PAY: "",
});

const db = new Map();
function redisCmd([cmd, key, ...rest]) {
  switch (cmd) {
    case "GET": return db.get(key) ?? null;
    case "MGET": return [key, ...rest].map((k) => db.get(k) ?? null);
    case "SET": {
      if (rest.includes("NX") && db.has(key)) return null;
      db.set(key, rest[0]);
      return "OK";
    }
    case "DEL": return db.delete(key) ? 1 : 0;
    case "INCR": { const v = Number(db.get(key) ?? 0) + 1; db.set(key, String(v)); return v; }
    case "EXPIRE": return 1;
    default: throw new Error("cmd " + cmd);
  }
}

const sfCalls = [];
let cartPrice = 18.5;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://redis.mock")) return ok({ result: redisCmd(JSON.parse(init.body)) });
  const m = url.match(/\/v1\/payments\/(\d+)$/);
  if (m) return ok({ id: Number(m[1]), status: m[1] === "1" ? "approved" : "pending", status_detail: m[1] === "1" ? "accredited" : "pending_waiting_transfer", payment_type_id: "credit_card", payment_method_id: "visa", installments: 1 });
  if (url.endsWith("/api/v0/cart")) { sfCalls.push("cart"); return ok({ id: `sf-${sfCalls.length}`, price: cartPrice, status: "pending" }); }
  if (url.endsWith("/api/v0/checkout")) {
    sfCalls.push("checkout");
    const { orders } = JSON.parse(init.body);
    return ok({ success: true, purchase: { status: "paid", orders: orders.map((id) => ({ id, tracking: "BR123TESTE" })) } });
  }
  throw new Error("fetch não mockado: " + url);
};
for (const k of ["log", "warn", "error"]) console[k] = () => {};

const { POST } = await import("../api/admin-order.js");
let ip = 0;
const post = (body, token = TOKEN) =>
  POST(new Request("http://x/api/admin-order", { method: "POST", headers: { authorization: `Bearer ${token}`, "x-real-ip": `203.0.113.${++ip}`, "content-type": "application/json" }, body: JSON.stringify(body) }));
let n = 0;
const test = async (name, fn) => { await fn(); n++; process.stdout.write(`ok - ${name}\n`); };

const order = (ref, payId, pkg = { weight: 1, height: 12, width: 20, length: 33 }) =>
  db.set(`brk:pedido:${ref}`, JSON.stringify({
    reference: ref, mpOrderId: `payment:${payId}`, createdAt: "2026-11-26T12:00:00Z",
    customer: { name: "Cliente Teste", email: "c@exemplo.com", phone: "11987654321", cpf: "19119119100", cep: "36305144", street: "Rua B", number: "1", district: "Centro", city: "São João del Rei", state: "mg" },
    items: [{ slug: "x", name: "Chuteira X", size: "42", quantity: 1, unitPrice: 299 }],
    shipping: { id: 1, name: "PAC", price: 29.83 }, package: pkg, subtotal: 299, total: 328.83, payment: null,
  }));
order("BRK-P1-AAAAAA", 1);
order("BRK-P2-BBBBBB", 2);
order("BRK-P3-CCCCCC", 1, null);

await test("sem token: 401 e nada na SuperFrete", async () => {
  assert.equal((await post({ ref: "BRK-P1-AAAAAA", acao: "criar_envio" }, "errado")).status, 401);
  assert.equal(sfCalls.length, 0);
});
await test("ação inválida, ref inválida e pagar sem limite: 400", async () => {
  assert.equal((await post({ ref: "BRK-P1-AAAAAA", acao: "apagar" })).status, 400);
  assert.equal((await post({ ref: "../x", acao: "criar_envio" })).status, 400);
  assert.equal((await post({ ref: "BRK-P1-AAAAAA", acao: "pagar_etiqueta" })).status, 400);
  assert.equal((await post({ ref: "BRK-P1-AAAAAA", acao: "pagar_etiqueta", limite: 1000 })).status, 400);
});
await test("pedido não pago: 409, nada na SuperFrete", async () => {
  assert.equal((await post({ ref: "BRK-P2-BBBBBB", acao: "criar_envio" })).status, 409);
  assert.equal(sfCalls.length, 0);
});
await test("criar_envio: cria uma vez (idempotente) e não paga", async () => {
  const r1 = await (await post({ ref: "BRK-P1-AAAAAA", acao: "criar_envio" })).json();
  const r2 = await (await post({ ref: "BRK-P1-AAAAAA", acao: "criar_envio" })).json();
  assert.equal(r1.ok, true);
  assert.equal(r1.order.shipment.status, "pending");
  assert.equal(r2.order.shipment.sfOrderId, r1.order.shipment.sfOrderId);
  assert.deepEqual(sfCalls, ["cart"]);
});
await test("pagar_etiqueta acima do limite confirmado: não paga", async () => {
  const r = await (await post({ ref: "BRK-P1-AAAAAA", acao: "pagar_etiqueta", limite: 10 })).json();
  assert.match(r.skipped, /acima do limite/);
  assert.deepEqual(sfCalls, ["cart"]);
});
await test("pagar_etiqueta dentro do limite: paga uma vez e devolve o rastreio", async () => {
  const r = await (await post({ ref: "BRK-P1-AAAAAA", acao: "pagar_etiqueta", limite: 30 })).json();
  assert.equal(r.order.shipment.status, "released");
  assert.equal(r.order.shipment.tracking, "BR123TESTE");
  const again = await (await post({ ref: "BRK-P1-AAAAAA", acao: "pagar_etiqueta", limite: 30 })).json();
  assert.equal(again.order.shipment.status, "released");
  assert.deepEqual(sfCalls, ["cart", "checkout"]);
});
await test("pedido sem pacote (frete a combinar): explica o motivo", async () => {
  const r = await (await post({ ref: "BRK-P3-CCCCCC", acao: "criar_envio" })).json();
  assert.equal(r.skipped, "frete a combinar");
});

process.stdout.write(`\n${n} testes de envio passaram\n`);
