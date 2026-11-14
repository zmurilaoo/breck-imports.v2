// Testes da API admin só-leitura (api/admin-*.js) com Redis e Mercado Pago mockados via fetch. Nada sai para a rede.
// Rodar depois de `npm run build:api`: node scripts/test-admin.mjs
import assert from "node:assert/strict";

const TOKEN = "tok-admin-teste-123";
Object.assign(process.env, { MP_ACCESS_TOKEN: "TEST-token", KV_REST_API_URL: "https://redis.mock", KV_REST_API_TOKEN: "x" });

const db = new Map();
const zsets = new Map();
const mpPayments = new Map();

function redisCmd([cmd, key, ...rest]) {
  if (cmd === "GET") return db.get(key) ?? null;
  if (cmd === "SET") { db.set(key, rest[0]); return "OK"; }
  if (cmd === "INCR") { const v = Number(db.get(key) ?? 0) + 1; db.set(key, String(v)); return v; }
  if (cmd === "EXPIRE") return 1;
  if (cmd === "MGET") return [key, ...rest].map((k) => db.get(k) ?? null);
  if (cmd === "ZADD") {
    const z = zsets.get(key) ?? new Map();
    for (let i = 0; i < rest.length; i += 2) z.set(String(rest[i + 1]), Number(rest[i]));
    zsets.set(key, z);
    return rest.length / 2;
  }
  if (cmd === "ZREVRANGEBYSCORE") {
    const [max, min, , , off, count] = rest;
    const z = [...(zsets.get(key) ?? new Map())].filter(([, sc]) => sc <= Number(max) && sc >= Number(min));
    z.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
    return z.slice(Number(off), Number(off) + Number(count)).flatMap(([m, sc]) => [m, String(sc)]);
  }
  if (cmd === "SCAN") {
    const re = new RegExp("^" + rest[1].replace(/\*/g, ".*") + "$");
    return ["0", [...db.keys()].filter((k) => re.test(k))];
  }
  throw new Error("cmd " + cmd);
}

let redisDown = false;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://redis.mock")) {
    if (redisDown) return new Response("{}", { status: 500 });
    return ok({ result: redisCmd(JSON.parse(init.body)) });
  }
  const m = url.match(/\/v1\/payments\/(\d+)$/);
  if (m) {
    if (mpPayments.has(m[1])) return ok(mpPayments.get(m[1]));
    // Corpo de erro com dado pessoal: não pode chegar ao log
    return new Response(JSON.stringify({ payer: { email: "vaza@x.com" } }), { status: 404 });
  }
  throw new Error("fetch não mockado: " + url);
};

// Log capturado: nenhum dado pessoal pode aparecer
const logs = [];
const origLog = console.log;
for (const k of ["log", "warn", "error"]) {
  console[k] = (...a) => { logs.push(a.map(String).join(" ")); if (k === "log") origLog(...a); };
}

const { GET: orders } = await import("../api/admin-orders.js");
const { GET: order } = await import("../api/admin-order.js");
const { GET: stats } = await import("../api/admin-stats.js");
const { POST: reindex } = await import("../api/admin-reindex.js");

let ipSeq = 0;
const auth = (t = TOKEN) => ({ authorization: `Bearer ${t}`, "x-real-ip": `198.51.100.${++ipSeq % 250}` });
const get = (fn, qs, headers = auth()) => fn(new Request(`http://x/api/x?${qs}`, { headers }));
let n = 0;
const test = async (name, fn) => { await fn(); n++; origLog("ok -", name); };

// ---------- Massa: 5 pedidos em datas conhecidas ----------
const T0 = Date.parse("2026-10-01T12:00:00Z");
const DAY = 86400000;
const cust = (i) => ({ name: `Cliente ${i}`, email: `pessoa${i}@exemplo.com`, phone: "11987654321", cpf: "191.191.191-00",
  cep: "01310100", street: "Av Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "sp" });
const pay = (status, typeId, methodId, id) => ({ id: String(id), status, statusDetail: status === "approved" ? "accredited" : "pending_waiting_transfer",
  typeId, methodId, installments: typeId === "credit_card" ? 3 : null, approvedAt: status === "approved" ? "2026-10-01T12:05:00Z" : null, updatedAt: "2026-10-01T12:05:00Z" });
const fixtures = [
  { ref: "BRK-A1-AAAAAA", ms: T0, p: pay("approved", "bank_transfer", "pix", 1), total: 300, ship: 20 },
  { ref: "BRK-A2-BBBBBB", ms: T0 + DAY, p: pay("approved", "credit_card", "visa", 2), total: 500, ship: 30 },
  { ref: "BRK-A3-CCCCCC", ms: T0 + 2 * DAY, p: pay("pending", "bank_transfer", "pix", 3), total: 200, ship: 20 },
  { ref: "BRK-A4-DDDDDD", ms: T0 + 2 * DAY, p: null, total: 250, ship: 25 }, // Checkout Pro sem webhook ainda; empate de timestamp com A3
  { ref: "BRK-A5-EEEEEE", ms: T0 + 40 * DAY, p: pay("rejected", "credit_card", "master", 5), total: 999, ship: 0 },
];
for (const [i, f] of fixtures.entries()) {
  db.set(`brk:pedido:${f.ref}`, JSON.stringify({
    reference: f.ref, mpOrderId: f.p ? `payment:${f.p.id}` : "", createdAt: new Date(f.ms).toISOString(), customer: cust(i),
    items: [{ slug: "chuteira-x", name: "Chuteira X", size: "40", quantity: 1, unitPrice: f.total - f.ship }],
    shipping: { id: 1, name: "PAC", price: f.ship }, package: null, subtotal: f.total - f.ship, total: f.total, payment: f.p,
  }));
}
db.set("brk:envio:BRK-A1-AAAAAA", JSON.stringify({ sfOrderId: "sf-1", price: 18.5, status: "released", tracking: "AA1BR", createdAt: "2026-10-01T12:06:00Z" }));
const PII = /exemplo\.com|19119119100|191\.191|987654321|vaza@|nao-pode-vazar|12345678909/;

// ---------- Auth ----------
await test("sem ADMIN_API_TOKEN: 503 admin api desligada", async () => {
  delete process.env.ADMIN_API_TOKEN;
  const r = await get(orders, "");
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: "admin api desligada" });
});
process.env.ADMIN_API_TOKEN = TOKEN;

await test("sem header, token errado, prefixo, sufixo, vazio ou sem 'Bearer': 401", async () => {
  for (const h of [{}, auth("errado"), auth(TOKEN.slice(0, -1)), auth(TOKEN + "x"), { authorization: "Bearer " }, { authorization: TOKEN }]) {
    const r = await get(orders, "", { ...h, "x-real-ip": `203.0.113.${++ipSeq % 250}` });
    assert.equal(r.status, 401, JSON.stringify(h));
  }
  for (const fn of [order, stats]) assert.equal((await get(fn, "ref=BRK-A1-AAAAAA", auth("x"))).status, 401);
  assert.equal((await reindex(new Request("http://x", { method: "POST", headers: auth("x") }))).status, 401);
});

await test("rate limit: 61a requisição do mesmo IP no minuto = 429, mesmo com token certo", async () => {
  const h = { authorization: "Bearer errado", "x-real-ip": "192.0.2.77" };
  const codes = [];
  for (let i = 0; i < 61; i++) codes.push((await get(orders, "", h)).status);
  assert.deepEqual(codes.slice(0, 60), Array(60).fill(401));
  assert.equal(codes[60], 429);
  assert.equal((await get(orders, "", { ...h, authorization: `Bearer ${TOKEN}` })).status, 429);
});

await test("Redis fora no rate limit: fecha a porta (503)", async () => {
  redisDown = true;
  try { assert.equal((await get(orders, "")).status, 503); } finally { redisDown = false; }
});

// ---------- Reindex ----------
await test("reindex reconstrói brk:pedidos a partir de brk:pedido:* e é idempotente", async () => {
  zsets.clear();
  db.set("brk:pedido:BRK-QUEBRADO-ZZZZZZ", "{json quebrado");
  const call = () => reindex(new Request("http://x", { method: "POST", headers: auth() }));
  const d = await (await call()).json();
  assert.equal(d.indexed, 5);
  assert.equal(d.invalid, 1);
  assert.equal(d.complete, true);
  assert.equal(zsets.get("brk:pedidos").get("BRK-A2-BBBBBB"), T0 + DAY);
  await call();
  assert.equal(zsets.get("brk:pedidos").size, 5);
  db.delete("brk:pedido:BRK-QUEBRADO-ZZZZZZ");
});

// ---------- Lista: período, status, paginação ----------
const range = `from=${new Date(T0 - DAY).toISOString()}&to=${new Date(T0 + 10 * DAY).toISOString()}`;
const ALL4 = ["BRK-A4-DDDDDD", "BRK-A3-CCCCCC", "BRK-A2-BBBBBB", "BRK-A1-AAAAAA"];

await test("filtro por período exclui pedido fora da janela; ordem do mais novo ao mais antigo", async () => {
  const d = await (await get(orders, range)).json();
  assert.deepEqual(d.orders.map((o) => o.ref), ALL4);
  assert.equal(d.nextCursor, null);
  assert.ok(Date.parse(d.generatedAt));
});

await test("filtro por status paid / pending / all; status inválido 400", async () => {
  const refs = async (s) => (await (await get(orders, `${range}&status=${s}`)).json()).orders.map((o) => o.ref);
  assert.deepEqual(await refs("paid"), ["BRK-A2-BBBBBB", "BRK-A1-AAAAAA"]);
  assert.deepEqual(await refs("pending"), ["BRK-A4-DDDDDD", "BRK-A3-CCCCCC"]);
  assert.deepEqual(await refs("all"), ALL4);
  assert.equal((await get(orders, `${range}&status=xpto`)).status, 400);
});

await test("paginação por cursor: sem pular nem repetir, inclusive no empate de timestamp", async () => {
  for (const limit of [1, 3]) {
    const seen = [];
    let cursor = "";
    let pages = 0;
    do {
      const d = await (await get(orders, `${range}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`)).json();
      seen.push(...d.orders.map((o) => o.ref));
      cursor = d.nextCursor ?? "";
      pages++;
    } while (cursor && pages < 10);
    assert.deepEqual(seen, ALL4, `limit=${limit}`);
  }
  assert.equal((await get(orders, `${range}&cursor=lixo`)).status, 400);
});

await test("parâmetros de período inválidos: 400", async () => {
  assert.equal((await get(orders, "from=ontem")).status, 400);
  assert.equal((await get(orders, `from=${new Date(T0).toISOString()}&to=${new Date(T0 - DAY).toISOString()}`)).status, 400);
  assert.equal((await get(stats, "from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z")).status, 400, "acima de 400 dias");
});

await test("lista no formato do contrato e sem e-mail/CPF/telefone", async () => {
  const body = await (await get(orders, range)).text();
  const o = JSON.parse(body).orders.find((x) => x.ref === "BRK-A1-AAAAAA");
  assert.deepEqual(Object.keys(o).sort(), ["createdAt", "customerCity", "customerName", "customerState", "itemsCount", "paymentMethod",
    "paymentStatus", "ref", "shipmentStatus", "shipping", "total", "tracking"]);
  assert.equal(o.paymentMethod, "pix");
  assert.equal(o.shipmentStatus, "released");
  assert.equal(o.tracking, "AA1BR");
  assert.equal(o.customerState, "SP");
  assert.doesNotMatch(body, PII);
});

// ---------- Detalhe e máscaras ----------
await test("detalhe mascara CPF, e-mail e telefone e consulta o MP só-leitura", async () => {
  mpPayments.set("3", { id: 3, status: "approved", status_detail: "accredited", payment_type_id: "bank_transfer", payment_method_id: "pix",
    date_approved: "2026-10-03T13:00:00Z", payer: { email: "nao-pode-vazar@x.com", identification: { number: "12345678909" } } });
  const body = await (await get(order, "ref=BRK-A3-CCCCCC")).text();
  const { order: o } = JSON.parse(body);
  assert.equal(o.customer.cpfMasked, "***.***.*91-00");
  assert.equal(o.customer.emailMasked, "p***@exemplo.com");
  assert.equal(o.customer.phoneMasked, "(11) *****-4321");
  assert.equal(o.paymentStatus, "approved", "status atual vindo do MP");
  assert.doesNotMatch(body.replace("@exemplo.com", "@MASCARADO"), PII);
  assert.equal(JSON.parse(db.get("brk:pedido:BRK-A3-CCCCCC")).payment.status, "pending", "admin não grava no pedido");
});

await test("detalhe: ref inválida 400, inexistente 404, MP com erro cai no status gravado", async () => {
  assert.equal((await get(order, "ref=../../etc")).status, 400);
  assert.equal((await get(order, "ref=BRK-abc-def")).status, 400);
  assert.equal((await get(order, "ref=BRK-ZZ-ZZZZZZ")).status, 404);
  const d = await (await get(order, "ref=BRK-A5-EEEEEE")).json(); // MP devolve 404 para o id 5
  assert.equal(d.order.paymentStatus, "rejected");
});

await test("máscaras em bordas: CPF curto, e-mail sem @, telefone fixo com +55", async () => {
  db.set("brk:pedido:BRK-B1-FFFFFF", JSON.stringify({ ...JSON.parse(db.get("brk:pedido:BRK-A1-AAAAAA")), reference: "BRK-B1-FFFFFF",
    customer: { ...cust(9), cpf: "123", email: "semarroba", phone: "+55 (21) 3333-4444" } }));
  const { order: o } = await (await get(order, "ref=BRK-B1-FFFFFF")).json();
  assert.equal(o.customer.cpfMasked, "***");
  assert.equal(o.customer.emailMasked, "***");
  assert.equal(o.customer.phoneMasked, "(21) ****-4444");
  db.delete("brk:pedido:BRK-B1-FFFFFF");
});

// ---------- Stats ----------
await test("stats: receita só de aprovados, pendentes incluem sem webhook, por método, frete, top produtos", async () => {
  const d = await (await get(stats, range)).json();
  assert.equal(d.revenuePaid, 800);
  assert.equal(d.ordersPaid, 2);
  assert.equal(d.ordersPending, 2);
  assert.equal(d.avgTicket, 400);
  assert.deepEqual(d.byMethod.pix, { count: 1, total: 300 });
  assert.deepEqual(d.byMethod.card, { count: 1, total: 500 });
  assert.equal(d.shippingCharged, 50);
  assert.equal(d.shippingPaid, 18.5);
  assert.deepEqual(d.topProducts[0], { slug: "chuteira-x", name: "Chuteira X", quantity: 2, total: 750 });
});

await test("nenhum dado pessoal nos logs", async () => {
  const all = logs.join("\n");
  assert.ok(logs.some((l) => l.includes("falha ao consultar o MP")), "o caminho de erro do MP foi exercitado");
  assert.doesNotMatch(all, PII);
  assert.doesNotMatch(all, /Cliente \d/);
});

origLog(`\n${n} testes admin passaram`);
