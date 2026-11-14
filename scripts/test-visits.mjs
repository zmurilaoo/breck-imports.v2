// Testes do contador de visitas (api/track.js) e da leitura admin (api/admin-visits.js) com Redis mockado via fetch.
// Rodar depois de `npm run build:api`: node scripts/test-visits.mjs
import assert from "node:assert/strict";

const TOKEN = "tok-admin-teste-123-0123456789abcdef";
Object.assign(process.env, { KV_REST_API_URL: "https://redis.mock", KV_REST_API_TOKEN: "x", ADMIN_API_TOKEN: TOKEN });

const kv = new Map(); // string
const hashes = new Map(); // key -> Map
const zsets = new Map(); // key -> Map
const hll = new Map(); // key -> Set (exato no mock)
const ttl = new Map();
const written = []; // todo argumento gravado, para provar que IP/UA não vão para o banco

const hm = (m, k) => m.get(k) ?? (m.set(k, new Map()), m.get(k));
function cmd([c, key, ...a]) {
  if (["SET", "HINCRBY", "ZINCRBY", "PFADD"].includes(c)) written.push(key, ...a.map(String));
  switch (c) {
    case "INCR": { const v = Number(kv.get(key) ?? 0) + 1; kv.set(key, String(v)); return v; }
    case "EXPIRE": ttl.set(key, Number(a[0])); return 1;
    case "GET": return kv.get(key) ?? null;
    case "SET": if (a.includes("NX") && kv.has(key)) return null; kv.set(key, String(a[0])); return "OK";
    case "HINCRBY": { const h = hm(hashes, key); h.set(a[0], (h.get(a[0]) ?? 0) + Number(a[1])); return h.get(a[0]); }
    case "HGETALL": return [...(hashes.get(key) ?? new Map())].flatMap(([k, v]) => [k, String(v)]);
    case "ZINCRBY": { const z = hm(zsets, key); z.set(a[1], (z.get(a[1]) ?? 0) + Number(a[0])); return String(z.get(a[1])); }
    case "ZREVRANGE": {
      const z = [...(zsets.get(key) ?? new Map())].sort((x, y) => y[1] - x[1]);
      return z.slice(Number(a[0]), Number(a[1]) + 1).flatMap(([m, s]) => [m, String(s)]);
    }
    case "PFADD": { const s = hll.get(key) ?? new Set(); hll.set(key, s); const had = s.has(a[0]); s.add(a[0]); return had ? 0 : 1; }
    case "PFCOUNT": return (hll.get(key) ?? new Set()).size;
    default: throw new Error("cmd " + c);
  }
}

let redisDown = false;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (redisDown) return new Response("{}", { status: 500 });
  if (url === "https://redis.mock/pipeline") return Response.json(JSON.parse(init.body).map((c) => ({ result: cmd(c) })));
  if (url === "https://redis.mock") return Response.json({ result: cmd(JSON.parse(init.body)) });
  throw new Error("fetch não mockado: " + url);
};

const logs = [];
const origLog = console.log;
for (const k of ["warn", "error"]) console[k] = (...x) => logs.push(x.map(String).join(" "));

const { POST: track } = await import("../api/track.js");
const { GET: visits } = await import("../api/admin-visits.js");

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const IP = "203.0.113.77";
const SLUG = "nike-tiempo-legend-r10-branca-dourada-campo";
const send = (body, headers = {}) =>
  track(new Request("http://x/api/track", {
    method: "POST",
    headers: { "user-agent": UA, "x-real-ip": IP, "content-type": "text/plain", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }));
let n = 0;
const test = async (name, fn) => { await fn(); n++; origLog("ok -", name); };
const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const day = (part) => (part ? `brk:visits:${today}:${part}` : `brk:visits:${today}`);

await test("evento válido: 204, contador diário, página, origem e visitante único", async () => {
  const r = await send({ type: "page_view", path: "/produtos?utm_source=x", ref: "www.instagram.com" });
  assert.equal(r.status, 204);
  assert.equal(hashes.get(day()).get("page_view"), 1);
  assert.equal(zsets.get(day("pages")).get("/produtos"), 1, "query string some");
  assert.equal(zsets.get(day("sources")).get("instagram.com"), 1, "www. some");
  assert.equal(hll.get(day("uv:page_view")).size, 1);
  assert.equal(ttl.get(day()), 400 * 86400);
});

await test("mesmo visitante no mesmo dia conta 1 visitante; outro IP conta 2", async () => {
  await send({ type: "page_view", path: "/" });
  assert.equal(hll.get(day("uv:page_view")).size, 1);
  assert.equal(hashes.get(day()).get("page_view"), 2);
  assert.equal(zsets.get(day("sources")).get("instagram.com"), 1, "sem ref não conta origem");
  await send({ type: "page_view", path: "/", ref: "" }, { "x-real-ip": "198.51.100.9" });
  assert.equal(hll.get(day("uv:page_view")).size, 2);
  assert.equal(zsets.get(day("sources")).get("direto"), 1);
});

await test("produto, carrinho, checkout, etapa e compra caem nos contadores certos", async () => {
  await send({ type: "product_view", path: `/produtos/${SLUG}`, slug: SLUG });
  await send({ type: "add_to_cart", path: `/produtos/${SLUG}`, slug: SLUG });
  await send({ type: "checkout_start", path: "/checkout" });
  await send({ type: "checkout_step", path: "/checkout", step: "entrega" });
  await send({ type: "purchase", path: "/pedido/sucesso" });
  const h = hashes.get(day());
  for (const k of ["product_view", "add_to_cart", "checkout_start", "checkout_step", "purchase"]) assert.equal(h.get(k), 1, k);
  assert.equal(zsets.get(day("products")).get(SLUG), 1);
  assert.equal(hashes.get(day("steps")).get("entrega"), 1);
});

await test("lixo é ignorado em silêncio (sempre 204): tipo, JSON, slug fora do catálogo, etapa inventada, corpo grande", async () => {
  const before = JSON.stringify([...hashes.get(day())]);
  for (const b of [
    { type: "hack", path: "/" },
    "não é json",
    "[]",
    { type: "product_view", slug: "nao-existe" },
    { type: "checkout_step", step: "outra" },
    JSON.stringify({ type: "page_view", path: "/", pad: "x".repeat(2000) }),
  ]) assert.equal((await send(b)).status, 204);
  assert.equal(JSON.stringify([...hashes.get(day())]), before);
});

await test("rota desconhecida e slug inválido viram balde (cardinalidade limitada)", async () => {
  await send({ type: "page_view", path: "/wp-admin/xyz" });
  await send({ type: "page_view", path: "/produtos/qualquer-coisa" });
  await send({ type: "page_view", path: "/<script>" });
  const z = zsets.get(day("pages"));
  assert.equal(z.get("/outra"), 1);
  assert.equal(z.get("/produtos/*"), 1);
  assert.ok(![...z.keys()].some((k) => k.includes("script") || k.includes("wp-admin")));
});

await test("bot, user-agent vazio, Do Not Track e GPC não contam", async () => {
  const before = hashes.get(day()).get("page_view");
  for (const h of [{ "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" }, { "user-agent": "" }, { dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "HeadlessChrome/120 Mozilla/5.0" }])
    assert.equal((await send({ type: "page_view", path: "/" }, h)).status, 204);
  assert.equal(hashes.get(day()).get("page_view"), before);
});

await test("rate limit: acima de 120 eventos/min por IP para de contar e segue 204", async () => {
  const ip = "192.0.2.50";
  for (let i = 0; i < 125; i++) assert.equal((await send({ type: "add_to_cart", path: "/" }, { "x-real-ip": ip })).status, 204);
  assert.equal(hashes.get(day()).get("add_to_cart"), 1 + 120);
});

await test("Redis fora do ar: 204 e log sem IP", async () => {
  redisDown = true;
  try { assert.equal((await send({ type: "page_view", path: "/" })).status, 204); } finally { redisDown = false; }
  assert.ok(logs.some((l) => l.includes("Track: falha")));
});

await test("LGPD: IP e user-agent nunca são gravados; sal diário expira em 48 h", async () => {
  const all = written.join("\n");
  for (const s of [IP, "198.51.100.9", "192.0.2.50", "iPhone"]) assert.ok(!all.includes(s), s);
  assert.equal(ttl.size > 0, true);
  assert.ok(kv.get(`brk:visits:salt:${today}`), "sal criado");
  assert.doesNotMatch(logs.join("\n"), /203\.0\.113|198\.51|192\.0\.2/);
});

// ---------- Leitura admin ----------
const auth = { authorization: `Bearer ${TOKEN}`, "x-real-ip": "10.0.0.1" };
const get = (qs, headers = auth) => visits(new Request(`http://x/api/admin-visits?${qs}`, { headers }));

await test("admin-visits sem token: 401; período inválido: 400", async () => {
  assert.equal((await get("", { "x-real-ip": "10.0.0.2" })).status, 401);
  assert.equal((await get("from=abc")).status, 400);
});

await test("admin-visits: dias, totais, funil com taxas, tops e origem", async () => {
  // um dia antigo para provar a soma entre dias
  const old = "2026-10-01";
  hm(hashes, `brk:visits:${old}`).set("page_view", 10);
  hll.set(`brk:visits:${old}:uv:page_view`, new Set(["a", "b", "c", "d"]));
  hll.set(`brk:visits:${old}:uv:purchase`, new Set(["a"]));
  hm(zsets, `brk:visits:${old}:pages`).set("/", 9);
  const r = await get(`from=2026-09-30T12:00:00Z&to=${new Date().toISOString()}`);
  assert.equal(r.status, 200);
  const d = await r.json();
  const o = d.days.find((x) => x.date === old);
  assert.deepEqual(o, { date: old, pageViews: 10, visitors: 4, productViews: 0, addToCart: 0, checkoutStart: 0, purchases: 0 });
  const t = d.days.find((x) => x.date === today);
  assert.equal(t.visitors, 2);
  assert.equal(t.productViews, 1);
  assert.equal(t.purchases, 1);
  assert.equal(d.totals.visitors, 6);
  assert.equal(d.funnel[0].stage, "page_view");
  assert.equal(d.funnel[0].visitors, 6);
  assert.equal(d.funnel.at(-1).visitors, 2);
  assert.equal(d.funnel.at(-1).rateFromStart, 33.3);
  assert.equal(d.conversionRate, 33.3);
  assert.equal(d.topPages[0].path, "/");
  assert.equal(d.topProducts[0].slug, SLUG);
  assert.ok(d.topProducts[0].name && d.topProducts[0].name !== SLUG, "nome do catálogo");
  assert.ok(d.sources.some((s) => s.source === "instagram.com"));
  assert.equal(d.checkoutSteps.entrega, 1);
  assert.equal(d.approximate, true);
  assert.ok(d.generatedAt);
  // dias sem dado aparecem zerados (gráfico contínuo)
  assert.ok(d.days.some((x) => x.date === "2026-09-30" && x.pageViews === 0));
});

await test("admin-visits com Redis fora: 503 no guard (fail-closed)", async () => {
  redisDown = true;
  try { assert.equal((await get("")).status, 503); } finally { redisDown = false; }
});

origLog(`\n${n} testes de visitas passaram`);
