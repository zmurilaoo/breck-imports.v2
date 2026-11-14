// Base da API administrativa SÓ-LEITURA consumida pelo dash: auth por token, rate limit, CORS,
// máscaras de dado pessoal (LGPD) e leitura do índice de pedidos. Nenhum endpoint daqui escreve em pedido.
import { createHash, timingSafeEqual } from "node:crypto";
import {
  dbReady,
  mercadoPago,
  ORDERS_INDEX,
  orderKey,
  paymentFromMp,
  paymentFromMpOrder,
  redis,
  shipmentKey,
  type StoredOrder,
  type StoredPayment,
  type StoredShipment,
} from "./_lib";

const e = (k: string) => (process.env[k] ?? "").trim();
const RATE_LIMIT = 60;
const RATE_WINDOW_S = 60;
/** Teto de pedidos lidos por consulta de período: a loja é pequena; acima disso o período precisa ser menor */
export const MAX_RANGE_ORDERS = 5000;
const MP_CACHE_S = 60;

export const REF_RE = /^BRK-[A-Z0-9]{1,16}-[A-Z0-9]{6}$/;

// ---------- Respostas, CORS e auth ----------

function corsHeaders(req: Request): Record<string, string> {
  const allowed = e("ADMIN_ALLOWED_ORIGIN").replace(/\/$/, "");
  const origin = req.headers.get("origin") ?? "";
  if (!allowed || origin !== allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export const adminJson = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(req) },
  });

/** Preflight do navegador: só responde com CORS se a origem bater com ADMIN_ALLOWED_ORIGIN */
export const preflight = (req: Request) => new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...corsHeaders(req) } });

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Compara o Bearer com ADMIN_API_TOKEN em tempo constante (hash de tamanho fixo antes do timingSafeEqual) */
function tokenOk(req: Request, expected: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  const given = m ? m[1].trim() : "";
  return timingSafeEqual(sha(given), sha(expected)) && given.length > 0;
}

const clientIp = (req: Request) =>
  (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "sem-ip";

/**
 * Porta de entrada de todo endpoint admin. Ordem: desligada (503) → banco (503) → rate limit (429) → token (401).
 * O rate limit vem antes do token para frear força bruta. Falha do Redis aqui fecha a porta (fail-closed).
 */
export async function guard(req: Request): Promise<Response | null> {
  const token = e("ADMIN_API_TOKEN");
  if (!token) return adminJson(req, { error: "admin api desligada" }, 503);
  if (!dbReady()) return adminJson(req, { error: "banco de pedidos não configurado" }, 503);
  try {
    const key = `brk:rl:admin:${sha(clientIp(req)).toString("hex")}`;
    const count = await redis<number>("INCR", key);
    if (count === 1) await redis("EXPIRE", key, RATE_WINDOW_S);
    if (count > RATE_LIMIT) return adminJson(req, { error: "muitas requisições" }, 429);
  } catch (err) {
    console.error("Admin: falha no rate limit", err);
    return adminJson(req, { error: "indisponível" }, 503);
  }
  if (!tokenOk(req, token)) {
    console.warn("Admin: token inválido");
    return adminJson(req, { error: "não autorizado" }, 401);
  }
  return null;
}

// ---------- Máscaras (nunca devolver CPF, e-mail ou telefone completos) ----------

export function maskCpf(cpf: string): string {
  const d = String(cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return "***";
  return `***.***.*${d[7]}${d[8]}-${d[9]}${d[10]}`;
}

export function maskEmail(email: string): string {
  const s = String(email ?? "").trim();
  const at = s.lastIndexOf("@");
  if (at < 1) return "***";
  return `${s[0]}***${s.slice(at)}`;
}

export function maskPhone(phone: string): string {
  const d = String(phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length < 10) return "***";
  const ddd = d.slice(0, 2);
  const last = d.slice(-4);
  return d.length === 11 ? `(${ddd}) *****-${last}` : `(${ddd}) ****-${last}`;
}

// ---------- Normalização ----------

export type PaymentStatus = "approved" | "pending" | "rejected" | "cancelled" | "unknown";
export type PaymentMethod = "pix" | "card" | "ticket" | "other";
export type ShipmentStatus = "none" | "pending" | "released" | "posted" | "delivered" | "canceled";

export function normPaymentStatus(p: StoredPayment | null | undefined): PaymentStatus {
  if (!p) return "unknown";
  const s = p.status.toLowerCase();
  const d = p.statusDetail.toLowerCase();
  // Payment API
  if (s === "approved") return "approved";
  if (["pending", "in_process", "authorized", "in_mediation"].includes(s)) return "pending";
  if (s === "rejected") return "rejected";
  if (["cancelled", "refunded", "charged_back"].includes(s)) return "cancelled";
  // Orders API (Checkout Pro)
  if (s === "processed") return d === "accredited" || !d ? "approved" : "pending";
  if (["created", "action_required", "processing", "open"].includes(s)) return "pending";
  if (s === "failed") return "rejected";
  if (["canceled", "expired", "refunded", "charged_back"].includes(s)) return "cancelled";
  return "unknown";
}

export function normMethod(p: StoredPayment | null | undefined): PaymentMethod | null {
  if (!p || (!p.typeId && !p.methodId)) return null;
  const t = p.typeId.toLowerCase();
  const m = p.methodId.toLowerCase();
  if (m === "pix" || t === "pix") return "pix";
  if (t === "credit_card" || t === "debit_card" || t === "prepaid_card") return "card";
  if (t === "ticket" || m === "bolbradesco" || m === "pec") return "ticket";
  return "other";
}

export function normShipment(s: StoredShipment | null | undefined): ShipmentStatus {
  if (!s) return "none";
  const v = String(s.status ?? "").toLowerCase();
  if (v === "cancelled" || v === "canceled") return "canceled";
  if (v === "released" || v === "posted" || v === "delivered" || v === "pending") return v;
  return "pending";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Loaded {
  order: StoredOrder;
  shipment: StoredShipment | null;
  createdMs: number;
}

export function summary({ order: o, shipment }: Loaded) {
  return {
    ref: o.reference,
    createdAt: o.createdAt,
    customerName: o.customer?.name ?? "",
    customerCity: o.customer?.city ?? "",
    customerState: (o.customer?.state ?? "").toUpperCase(),
    itemsCount: (o.items ?? []).reduce((n, i) => n + (Number(i.quantity) || 0), 0),
    total: round2(Number(o.total) || 0),
    shipping: { name: o.shipping?.name ?? "", price: round2(Number(o.shipping?.price) || 0) },
    paymentStatus: normPaymentStatus(o.payment),
    paymentMethod: normMethod(o.payment),
    shipmentStatus: normShipment(shipment),
    tracking: shipment?.tracking ?? null,
  };
}

export function detail(l: Loaded) {
  const o = l.order;
  const c = o.customer;
  const p = o.payment ?? null;
  const s = l.shipment;
  return {
    ...summary(l),
    customer: {
      name: c.name,
      emailMasked: maskEmail(c.email),
      phoneMasked: maskPhone(c.phone),
      cpfMasked: maskCpf(c.cpf),
      cep: c.cep,
      street: c.street,
      number: c.number,
      complement: c.complement ?? "",
      district: c.district,
      city: c.city,
      state: c.state.toUpperCase(),
    },
    items: o.items.map((i) => ({ slug: i.slug, name: i.name, size: i.size, quantity: i.quantity, unitPrice: i.unitPrice })),
    subtotal: round2(Number(o.subtotal) || 0),
    payment: p
      ? { id: p.id, status: normPaymentStatus(p), statusDetail: p.statusDetail, method: normMethod(p), installments: p.installments ?? 1, approvedAt: p.approvedAt }
      : null,
    shipment: s
      ? { sfOrderId: s.sfOrderId, price: round2(Number(s.price) || 0), status: normShipment(s), tracking: s.tracking ?? null, createdAt: s.createdAt, paidAt: s.paidAt ?? null }
      : null,
  };
}

// ---------- Leitura ----------

async function mget(keys: string[]): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (let i = 0; i < keys.length; i += 200) {
    const chunk = keys.slice(i, i + 200);
    out.push(...(await redis<(string | null)[]>("MGET", ...chunk)));
  }
  return out;
}

const parse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Pedidos do período, do mais novo para o mais antigo. Pedido expirado (sumiu do Redis) é ignorado. */
export async function loadRange(fromMs: number, toMs: number): Promise<{ items: Loaded[]; truncated: boolean }> {
  // [ref, score, ref, score, ...]
  const flat = await redis<string[]>("ZREVRANGEBYSCORE", ORDERS_INDEX, toMs, fromMs, "WITHSCORES", "LIMIT", 0, MAX_RANGE_ORDERS + 1);
  const pairs: { ref: string; ms: number }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pairs.push({ ref: String(flat[i]), ms: Number(flat[i + 1]) });
  const truncated = pairs.length > MAX_RANGE_ORDERS;
  const list = pairs.slice(0, MAX_RANGE_ORDERS);
  if (!list.length) return { items: [], truncated };
  const orders = await mget(list.map((p) => orderKey(p.ref)));
  const ships = await mget(list.map((p) => shipmentKey(p.ref)));
  const items: Loaded[] = [];
  list.forEach((p, i) => {
    const order = parse<StoredOrder>(orders[i]);
    if (order) items.push({ order, shipment: parse<StoredShipment>(ships[i]), createdMs: p.ms });
  });
  // Desempate estável por ref para a paginação por cursor não pular nem repetir
  items.sort((a, b) => b.createdMs - a.createdMs || (a.order.reference < b.order.reference ? 1 : -1));
  return { items, truncated };
}

export async function loadOne(ref: string): Promise<Loaded | null> {
  const [rawO, rawS] = await redis<(string | null)[]>("MGET", orderKey(ref), shipmentKey(ref));
  const order = parse<StoredOrder>(rawO);
  if (!order) return null;
  return { order, shipment: parse<StoredShipment>(rawS), createdMs: Date.parse(order.createdAt) };
}

/**
 * Estado atual do pagamento direto do Mercado Pago, com cache de 60 s no Redis.
 * Só leitura: não grava no pedido (quem grava é o webhook). Falha cai no que está gravado.
 */
export async function livePayment(o: StoredOrder): Promise<StoredPayment | null> {
  const cacheKey = `brk:admin-mp:${o.reference}`;
  try {
    const cached = parse<StoredPayment>(await redis<string | null>("GET", cacheKey));
    if (cached) return cached;
  } catch (err) {
    console.error("Admin: falha ao ler cache do MP", o.reference, err);
  }
  try {
    let p: StoredPayment | null = null;
    const payId = o.payment?.id && /^\d{1,20}$/.test(o.payment.id) ? o.payment.id : o.mpOrderId.match(/^payment:(\d{1,20})$/)?.[1];
    if (payId) p = paymentFromMp(await mercadoPago(`/v1/payments/${payId}`));
    else if (o.mpOrderId && /^[A-Za-z0-9_-]{1,64}$/.test(o.mpOrderId)) p = paymentFromMpOrder(await mercadoPago(`/v1/orders/${o.mpOrderId}`));
    if (p) await redis("SET", cacheKey, JSON.stringify(p), "EX", MP_CACHE_S).catch(() => {});
    return p ?? o.payment ?? null;
  } catch (err) {
    // Só o status HTTP: o corpo de erro do MP não vai para o log (pode conter dado do pagador)
    console.error("Admin: falha ao consultar o MP", o.reference, String(err).match(/Mercado Pago \d{3}/)?.[0] ?? "erro de rede");
    return o.payment ?? null;
  }
}

// ---------- Parâmetros ----------

const DAY = 24 * 3600 * 1000;

/** from/to em ISO; padrão = últimos 30 dias. Devolve erro em texto quando inválido. */
export function parsePeriod(url: URL): { fromMs: number; toMs: number } | string {
  const toRaw = url.searchParams.get("to");
  const fromRaw = url.searchParams.get("from");
  const toMs = toRaw ? Date.parse(toRaw) : Date.now();
  if (!Number.isFinite(toMs)) return "to inválido (use ISO 8601)";
  const fromMs = fromRaw ? Date.parse(fromRaw) : toMs - 30 * DAY;
  if (!Number.isFinite(fromMs)) return "from inválido (use ISO 8601)";
  if (fromMs > toMs) return "from depois de to";
  if (toMs - fromMs > 400 * DAY) return "período máximo de 400 dias";
  return { fromMs, toMs };
}
