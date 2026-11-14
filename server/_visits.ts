// Contadores de visita do site, diários, no Upstash Redis. Sem cookie, sem IP guardado, sem dado pessoal (LGPD).
// Visitante único é APROXIMADO: HyperLogLog de sha256(sal do dia + IP + user-agent). O sal é aleatório,
// vive 48 h no Redis e some sozinho; sem ele o hash não volta para o IP. Nada disso identifica pessoa.
import { createHash, randomBytes } from "node:crypto";
import { env } from "./_lib";
import { getProduct } from "../src/data/catalog";

export const EVENT_TYPES = ["page_view", "product_view", "add_to_cart", "checkout_start", "checkout_step", "purchase"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** Etapas do funil com visitante único por dia (checkout_step fica fora: é detalhe dentro do checkout) */
export const FUNNEL_TYPES = ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"] as const;
export const CHECKOUT_STEPS = ["contato", "entrega", "pagamento"] as const;

export const VISITS_TTL_S = 400 * 24 * 3600;
export const MAX_BODY = 1024;
/** Eventos por minuto por IP (o IP entra só como hash na chave do limite, que expira em 60 s) */
export const TRACK_RATE_LIMIT = 120;
/** Brasil sem horário de verão desde 2019: o dia da loja é UTC-3 */
const TZ_OFFSET_MS = 3 * 3600 * 1000;

export const dayOf = (ms: number) => new Date(ms - TZ_OFFSET_MS).toISOString().slice(0, 10);
export const visitsKey = (day: string, part?: string) => (part ? `brk:visits:${day}:${part}` : `brk:visits:${day}`);

const BOT_RE =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|curl|wget|python|axios|node-fetch|go-http|java\/|facebookexternalhit|whatsapp|telegram|monitor|uptime/i;
export const isBot = (ua: string) => !ua || ua.length < 10 || BOT_RE.test(ua);

/** Caminho normalizado com cardinalidade limitada: rota desconhecida vira um balde e a query string some */
export function normPath(raw: unknown): string | null {
  const p = String(raw ?? "").split(/[?#]/)[0].toLowerCase().replace(/\/+$/, "") || "/";
  if (p.length > 100 || !/^\/[a-z0-9\-/]*$/.test(p)) return null;
  if (p === "/" || p === "/produtos" || p === "/busca" || p === "/checkout") return p;
  const m = p.match(/^\/(produtos|categoria|pagina|pedido)\/([a-z0-9-]{1,80})$/);
  if (!m) return "/outra";
  if (m[1] === "produtos") return getProduct(m[2]) ? p : "/produtos/*";
  if (m[1] === "pedido") return ["sucesso", "pendente", "erro"].includes(m[2]) ? p : "/pedido/*";
  return p;
}

export function normSlug(raw: unknown): string | null {
  const s = String(raw ?? "").toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(s) && getProduct(s) ? s : null;
}

/** Origem já resolvida no navegador (utm_source ou host do referrer). Vazio = "direto"; ausente = não conta. */
export function normSource(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase().replace(/^www\./, "");
  if (!s) return "direto";
  return /^[a-z0-9._-]{1,40}$/.test(s) ? s : "outra";
}

export interface TrackEvent {
  type: EventType;
  path: string | null;
  slug: string | null;
  step: string | null;
  source: string | null;
}

export function parseEvent(body: unknown): TrackEvent | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const type = String(b.type ?? "") as EventType;
  if (!EVENT_TYPES.includes(type)) return null;
  const step = (CHECKOUT_STEPS as readonly string[]).includes(String(b.step)) ? String(b.step) : null;
  if (type === "checkout_step" && !step) return null;
  const slug = normSlug(b.slug);
  if (type === "product_view" && !slug) return null;
  return { type, path: normPath(b.path), slug, step, source: type === "page_view" ? normSource(b.ref) : null };
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Upstash REST /pipeline: vários comandos numa ida só. Falha de qualquer comando vira exceção. */
export async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let i = 0; i < commands.length; i += 400) {
    const res = await fetch(`${env.redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.slice(i, i + 400)),
    });
    const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string }[] | null;
    if (!res.ok || !Array.isArray(data)) throw new Error(`Redis pipeline ${res.status}`);
    for (const d of data) {
      if (d?.error) throw new Error(`Redis: ${d.error}`);
      out.push(d?.result ?? null);
    }
  }
  return out;
}

/** Grava um evento. ip/ua só entram no hash do dia e no rate limit; nunca são gravados. false = barrado pelo limite. */
export async function recordEvent(ev: TrackEvent, ip: string, ua: string, nowMs = Date.now()): Promise<boolean> {
  const day = dayOf(nowMs);
  const rl = `brk:rl:track:${sha(ip)}`;
  const saltKey = `brk:visits:salt:${day}`;
  const [count, , salt0] = await pipeline([["INCR", rl], ["EXPIRE", rl, 60], ["GET", saltKey]]);
  if (Number(count) > TRACK_RATE_LIMIT) return false;
  let salt = salt0 as string | null;
  if (!salt) {
    const [, s] = await pipeline([["SET", saltKey, randomBytes(16).toString("hex"), "NX", "EX", 48 * 3600], ["GET", saltKey]]);
    salt = String(s);
  }
  const visitor = sha(`${salt}|${ip}|${ua}`).slice(0, 32);
  const base = visitsKey(day);
  const cmds: (string | number)[][] = [["HINCRBY", base, ev.type, 1]];
  const touched = [base];
  const add = (part: string, cmd: string, ...args: (string | number)[]) => {
    const key = visitsKey(day, part);
    cmds.push([cmd, key, ...args]);
    touched.push(key);
  };
  if ((FUNNEL_TYPES as readonly string[]).includes(ev.type)) add(`uv:${ev.type}`, "PFADD", visitor);
  if (ev.type === "page_view" && ev.path) add("pages", "ZINCRBY", 1, ev.path);
  if (ev.type === "page_view" && ev.source) add("sources", "ZINCRBY", 1, ev.source);
  if (ev.type === "product_view" && ev.slug) add("products", "ZINCRBY", 1, ev.slug);
  if (ev.type === "checkout_step" && ev.step) add("steps", "HINCRBY", ev.step, 1);
  for (const key of touched) cmds.push(["EXPIRE", key, VISITS_TTL_S]);
  await pipeline(cmds);
  return true;
}

// ---------- Leitura (admin) ----------

export const MAX_VISIT_DAYS = 400;

export function daysBetween(fromMs: number, toMs: number): string[] {
  const out: string[] = [];
  const last = dayOf(toMs);
  let d = dayOf(fromMs);
  while (d <= last && out.length < MAX_VISIT_DAYS) {
    out.push(d);
    d = new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  }
  return out;
}

const toPairs = (flat: unknown): [string, number][] => {
  const a = Array.isArray(flat) ? flat : [];
  const out: [string, number][] = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push([String(a[i]), Number(a[i + 1]) || 0]);
  return out;
};
const asHash = (flat: unknown): Record<string, number> => Object.fromEntries(toPairs(flat));
const merge = (m: Map<string, number>, pairs: [string, number][]) => pairs.forEach(([k, v]) => m.set(k, (m.get(k) ?? 0) + v));
const top = (m: Map<string, number>, n: number) => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

const FUNNEL_LABEL: Record<(typeof FUNNEL_TYPES)[number], string> = {
  page_view: "Entraram no site",
  product_view: "Viram um produto",
  add_to_cart: "Puseram no carrinho",
  checkout_start: "Começaram a finalizar",
  purchase: "Compraram",
};

/** Lê o período dia a dia. Tops somam o top 50 de cada dia (aproximado em períodos longos com cauda grande). */
export async function readVisits(fromMs: number, toMs: number) {
  const days = daysBetween(fromMs, toMs);
  const cmds: (string | number)[][] = [];
  for (const d of days) {
    cmds.push(["HGETALL", visitsKey(d)]);
    for (const t of FUNNEL_TYPES) cmds.push(["PFCOUNT", visitsKey(d, `uv:${t}`)]);
    cmds.push(["ZREVRANGE", visitsKey(d, "pages"), 0, 49, "WITHSCORES"]);
    cmds.push(["ZREVRANGE", visitsKey(d, "products"), 0, 49, "WITHSCORES"]);
    cmds.push(["ZREVRANGE", visitsKey(d, "sources"), 0, 49, "WITHSCORES"]);
    cmds.push(["HGETALL", visitsKey(d, "steps")]);
  }
  const per = 1 + FUNNEL_TYPES.length + 4;
  const res = cmds.length ? await pipeline(cmds) : [];
  const pages = new Map<string, number>();
  const products = new Map<string, number>();
  const sources = new Map<string, number>();
  const checkoutSteps = { contato: 0, entrega: 0, pagamento: 0 };
  const uniq = { page_view: 0, product_view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 };
  const out = days.map((date, i) => {
    const r = res.slice(i * per, (i + 1) * per);
    const h = asHash(r[0]);
    const uv = FUNNEL_TYPES.map((_, j) => Number(r[1 + j]) || 0);
    FUNNEL_TYPES.forEach((t, j) => (uniq[t] += uv[j]));
    const o = 1 + FUNNEL_TYPES.length;
    merge(pages, toPairs(r[o]));
    merge(products, toPairs(r[o + 1]));
    merge(sources, toPairs(r[o + 2]));
    const st = asHash(r[o + 3]);
    for (const s of CHECKOUT_STEPS) checkoutSteps[s] += st[s] ?? 0;
    return {
      date,
      pageViews: h.page_view ?? 0,
      visitors: uv[0],
      productViews: h.product_view ?? 0,
      addToCart: h.add_to_cart ?? 0,
      checkoutStart: h.checkout_start ?? 0,
      purchases: h.purchase ?? 0,
    };
  });
  const sum = (k: Exclude<keyof (typeof out)[number], "date">) => out.reduce((n, d) => n + d[k], 0);
  return {
    days: out,
    totals: {
      pageViews: sum("pageViews"),
      visitors: sum("visitors"),
      productViews: sum("productViews"),
      addToCart: sum("addToCart"),
      checkoutStart: sum("checkoutStart"),
      purchases: sum("purchases"),
    },
    topPages: top(pages, 10).map(([path, views]) => ({ path, views })),
    topProducts: top(products, 10).map(([slug, views]) => ({ slug, name: getProduct(slug)?.name ?? slug, views })),
    sources: top(sources, 10).map(([source, visits]) => ({ source, visits })),
    funnel: FUNNEL_TYPES.map((t, i) => ({
      stage: t,
      label: FUNNEL_LABEL[t],
      visitors: uniq[t],
      rateFromPrevious: i === 0 ? null : pct(uniq[t], uniq[FUNNEL_TYPES[i - 1]]),
      rateFromStart: i === 0 ? null : pct(uniq[t], uniq.page_view),
    })),
    checkoutSteps,
    conversionRate: pct(uniq.purchase, uniq.page_view),
    approximate: true as const,
  };
}
