// Testes do esgotado em tempo real (api/estoque.js, api/admin-stock.js e o bloqueio no pagamento). Nada sai para a rede.
// Rodar depois de `npm run build:api`: node scripts/test-stock.mjs
import assert from "node:assert/strict";

const TOKEN = "tok-admin-teste-123-0123456789abcdef";
Object.assign(process.env, { ADMIN_API_TOKEN: TOKEN, MP_ACCESS_TOKEN: "TEST-token", KV_REST_API_URL: "https://redis.mock", KV_REST_API_TOKEN: "x" });

const db = new Map();
let redisDown = false;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (!url.startsWith("https://redis.mock")) throw new Error("fetch não mockado: " + url);
  if (redisDown) return new Response("down", { status: 500 });
  const [cmd, key, ...rest] = JSON.parse(init.body);
  let result;
  if (cmd === "GET") result = db.get(key) ?? null;
  else if (cmd === "SET") (db.set(key, rest[0]), (result = "OK"));
  else if (cmd === "INCR") (db.set(key, String(Number(db.get(key) ?? 0) + 1)), (result = Number(db.get(key))));
  else if (cmd === "EXPIRE") result = 1;
  else throw new Error("cmd " + cmd);
  return new Response(JSON.stringify({ result }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const { GET: estoque } = await import("../api/estoque.js");
const { GET: adminGet, POST: adminPost } = await import("../api/admin-stock.js");
const { POST: pay } = await import("../api/pay.js");

const SLUG = "adizero-pro-4-brown-and-black";
const auth = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const mark = (body, headers = auth) => adminPost(new Request("http://x/api/admin-stock", { method: "POST", headers, body: JSON.stringify(body) }));
let n = 0;
const test = async (name, fn) => {
  await fn();
  n++;
  console.log("ok -", name);
};

await test("sem token: 401; nada é gravado", async () => {
  const r = await mark({ slug: SLUG, size: "40", soldOut: true }, { "Content-Type": "application/json" });
  assert.equal(r.status, 401);
  assert.equal(db.get("brk:esgotado"), undefined);
});

await test("produto ou tamanho que não existe é recusado (não cria nada)", async () => {
  assert.equal((await mark({ slug: "produto-inventado", size: "40", soldOut: true })).status, 404);
  assert.equal((await mark({ slug: SLUG, size: "52", soldOut: true })).status, 400);
  assert.equal((await mark({ slug: SLUG, size: "40" })).status, 400);
});

await test("marca e desmarca um tamanho; público vê na hora", async () => {
  const r = await mark({ slug: SLUG, size: "40", soldOut: true });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).soldOut, ["40"]);
  assert.deepEqual((await (await estoque()).json()).soldOut[SLUG], ["40"]);
  await mark({ slug: SLUG, size: "40", soldOut: false });
  assert.equal((await (await estoque()).json()).soldOut[SLUG], undefined);
});

await test("produto inteiro (*) e leitura do painel", async () => {
  await mark({ slug: SLUG, size: "*", soldOut: true });
  const g = await adminGet(new Request("http://x/api/admin-stock", { headers: auth }));
  assert.deepEqual((await g.json()).soldOut[SLUG], ["*"]);
});

await test("pagamento de tamanho esgotado é recusado com 409 antes de falar com o Mercado Pago", async () => {
  const body = { formData: { payment_method_id: "pix" }, items: [{ slug: SLUG, size: "40", quantity: 1 }], customer: {}, shippingId: 1 };
  const r = await pay(new Request("http://x/api/pay", { method: "POST", body: JSON.stringify(body) }));
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, /esgotar/);
});

await test("Redis fora: estoque público responde vazio (o site segue vendendo)", async () => {
  redisDown = true;
  const r = await estoque();
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).soldOut, {});
  redisDown = false;
});

console.log(`\n${n} testes de esgotado passaram`);
