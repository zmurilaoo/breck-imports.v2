// Ponte entre a loja, o Mercado Pago, a SuperFrete e o banco de pedidos (Upstash Redis).
// Os tokens ficam só nas variáveis de ambiente da Vercel.
import { getProduct } from "../src/data/catalog";

const e = (k: string) => (process.env[k] ?? "").trim();
const num = (k: string, fallback: number) => {
  const n = Number(process.env[k]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const env = {
  mpToken: e("MP_ACCESS_TOKEN"),
  mpWebhookSecret: e("MP_WEBHOOK_SECRET"),
  sfToken: e("SUPERFRETE_TOKEN"),
  sfApi: e("SUPERFRETE_SANDBOX") === "true" ? "https://sandbox.superfrete.com" : "https://api.superfrete.com",
  originCep: e("SUPERFRETE_CEP_ORIGEM").replace(/\D/g, ""),
  siteUrl: (e("SITE_URL") || "https://breck-importsv2.vercel.app").replace(/\/$/, ""),
  storeEmail: e("LOJA_EMAIL") || "contato@breckimports.com.br",
  /** Peso de um par já na caixa, em kg. SUPOSIÇÃO: 1 kg até o dono pesar a caixa */
  kgPerPair: num("SUPERFRETE_PESO_PAR_KG", 1),
  /** Pagar a etiqueta com o saldo da SuperFrete logo depois de criar o envio (desligado por padrão) */
  sfAutoPay: e("SUPERFRETE_AUTO_PAY") === "true",
  /** Freio de mão: acima disso a etiqueta fica no carrinho para o dono pagar no painel */
  sfAutoPayMax: num("SUPERFRETE_AUTO_PAY_MAX", 80),
  /** true = declaração de conteúdo; false exigiria nota fiscal, que a loja ainda não emite pela API */
  sfNonCommercial: e("SUPERFRETE_NAO_COMERCIAL") !== "false",
  sender: {
    name: e("SUPERFRETE_REMETENTE_NOME"),
    address: e("SUPERFRETE_REMETENTE_ENDERECO"),
    number: e("SUPERFRETE_REMETENTE_NUMERO"),
    complement: e("SUPERFRETE_REMETENTE_COMPLEMENTO"),
    district: e("SUPERFRETE_REMETENTE_BAIRRO"),
    city: e("SUPERFRETE_REMETENTE_CIDADE"),
    state_abbr: e("SUPERFRETE_REMETENTE_UF").toUpperCase(),
    document: e("SUPERFRETE_REMETENTE_DOCUMENTO").replace(/\D/g, ""),
  },
  // A integração Upstash da Vercel injeta KV_REST_API_*; o console da Upstash usa UPSTASH_REDIS_REST_*
  redisUrl: (e("KV_REST_API_URL") || e("UPSTASH_REDIS_REST_URL")).replace(/\/$/, ""),
  redisToken: e("KV_REST_API_TOKEN") || e("UPSTASH_REDIS_REST_TOKEN"),
};

export interface CartInput {
  slug: string;
  size: string;
  quantity: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN: Record<string, number> = {
  name: 120, email: 160, phone: 20, cpf: 20, cep: 12,
  street: 160, number: 20, complement: 80, district: 120, city: 120, state: 2,
};
const REQUIRED = ["name", "email", "phone", "cpf", "cep", "street", "number", "district", "city", "state"] as const;

/** Valida o cliente na fronteira: presença, tamanho máximo e formato de e-mail/CPF. Devolve a mensagem de erro ou null. */
export function validateCustomer(c: Customer | null | undefined): string | null {
  const rec = (c ?? {}) as Record<string, unknown>;
  for (const k of REQUIRED) {
    const v = String(rec[k] ?? "").trim();
    if (!v) return `Preencha o campo ${k}`;
    if (v.length > (MAX_LEN[k] ?? 200)) return `Campo ${k} muito longo`;
  }
  if (String(rec["complement"] ?? "").length > MAX_LEN.complement) return "Campo complemento muito longo";
  if (!EMAIL_RE.test(String(rec["email"] ?? "").trim())) return "E-mail inválido";
  if (String(rec["cpf"] ?? "").replace(/\D/g, "").length !== 11) return "CPF inválido";
  return null;
}

/** Versão do pedido para log: mascara CPF e telefone (LGPD), mantém o que serve para rastrear. */
export function orderForLog(o: StoredOrder) {
  const mask = (s: string, keep = 3) => {
    const d = String(s ?? "").replace(/\D/g, "");
    return d.length <= keep ? "*".repeat(d.length) : "*".repeat(d.length - keep) + d.slice(-keep);
  };
  return {
    reference: o.reference,
    mpOrderId: o.mpOrderId,
    total: o.total,
    items: o.items.map((i) => ({ slug: i.slug, size: i.size, quantity: i.quantity })),
    customer: { cpf: mask(o.customer.cpf), phone: mask(o.customer.phone), cep: o.customer.cep, city: o.customer.city, state: o.customer.state },
  };
}

/** Remonta o carrinho com os preços do catálogo: o preço nunca vem do navegador */
export function priceItems(items: CartInput[]) {
  if ((items?.length ?? 0) > 20) throw new Error("Carrinho inválido");
  return items.map((i) => {
    const product = getProduct(i.slug);
    if (!product) throw new Error(`Produto não encontrado: ${i.slug}`);
    const quantity = Math.max(1, Math.min(10, Math.floor(i.quantity)));
    return { product, size: String(i.size), quantity };
  });
}

/** Caixa de um par: 15 (altura) x 20 (largura) x 30 (comprimento) cm. Pares a mais empilham na altura. */
export const BOX = { height: 15, width: 20, length: 30 };
/** Correios (PAC/SEDEX): cada lado até 150 cm e soma dos lados até 200 cm → no máximo 10 pares por volume */
export const MAX_PAIRS = Math.floor((200 - BOX.width - BOX.length) / BOX.height);

export function packageFor(pairs: number) {
  const n = Math.max(1, Math.floor(pairs));
  if (n > MAX_PAIRS) throw new Error(`Máximo de ${MAX_PAIRS} pares por envio`);
  return { height: BOX.height * n, width: BOX.width, length: BOX.length, weight: Math.round(env.kgPerPair * n * 1000) / 1000 };
}

// PAC e SEDEX. Mini Envios (17) fica de fora: aceita no máximo 16x4x24 cm e 300 g.
export const SF_SERVICES = "1,2";

/** Sem SuperFrete configurada: frete combinado com a loja depois da compra */
export const MANUAL_SHIPPING = { id: 0, name: "Frete a combinar pelo WhatsApp", price: 0, days: 0 };

export interface ShippingOption {
  id: number;
  name: string;
  price: number;
  days: number;
}

interface SfQuote {
  id: number;
  name: string;
  price: number;
  delivery_time: number;
  error?: string;
  has_error?: boolean;
}

export async function superfrete(path: string, body?: unknown) {
  const res = await fetch(`${env.sfApi}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${env.sfToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `Breck Imports (${env.storeEmail})`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`SuperFrete ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export const shippingReady = () => Boolean(env.sfToken && env.originCep);

/** Cotação PAC/SEDEX para um carrinho; sem SuperFrete configurada devolve só o frete a combinar */
export async function quoteShipping(cep: string, lines: ReturnType<typeof priceItems>): Promise<ShippingOption[]> {
  if (!shippingReady()) return [MANUAL_SHIPPING];
  const pairs = lines.reduce((n, l) => n + l.quantity, 0) || 1;
  const value = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);
  const quotes = (await superfrete("/api/v0/calculator", {
    from: { postal_code: env.originCep },
    to: { postal_code: cep.replace(/\D/g, "") },
    services: SF_SERVICES,
    options: { own_hand: false, receipt: false, insurance_value: value, use_insurance_value: false },
    package: packageFor(pairs),
  })) as SfQuote[];
  return (Array.isArray(quotes) ? quotes : [])
    .filter((q) => !q.has_error && !q.error && Number(q.price) > 0)
    .map((q) => ({ id: q.id, name: q.name, price: Number(q.price), days: q.delivery_time }))
    .sort((a, b) => a.price - b.price);
}

export async function mercadoPago(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.mpToken}`, "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ---------- Banco de pedidos: Upstash Redis via REST (POST com o comando como array JSON) ----------

export const dbReady = () => Boolean(env.redisUrl && env.redisToken);

export async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const res = await fetch(env.redisUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
  if (!res.ok || !data || data.error) throw new Error(`Redis ${res.status}: ${data?.error ?? "resposta inválida"}`);
  return data.result as T;
}

export const ORDER_TTL = 60 * 60 * 24 * 180; // 180 dias
export const orderKey = (ref: string) => `brk:pedido:${ref}`;
export const shipmentKey = (ref: string) => `brk:envio:${ref}`;
export const lockKey = (ref: string) => `brk:envio-lock:${ref}`;

export interface StoredOrder {
  reference: string;
  mpOrderId: string;
  createdAt: string;
  customer: Customer;
  items: { slug: string; name: string; size: string; quantity: number; unitPrice: number }[];
  shipping: ShippingOption;
  package: ReturnType<typeof packageFor> | null;
  subtotal: number;
  total: number;
}

export interface StoredShipment {
  sfOrderId: string;
  price: number;
  status: string; // pending (no carrinho) | released (paga) | ...
  tracking?: string | null;
  createdAt: string;
  paidAt?: string;
  note?: string;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
