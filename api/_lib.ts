// Ponte entre a loja, o Mercado Pago e a SuperFrete. Os tokens ficam só nas variáveis de ambiente da Vercel.
import { getProduct } from "../src/data/catalog";

export const env = {
  mpToken: process.env.MP_ACCESS_TOKEN ?? "",
  sfToken: process.env.SUPERFRETE_TOKEN ?? "",
  sfApi: process.env.SUPERFRETE_SANDBOX === "true" ? "https://sandbox.superfrete.com" : "https://api.superfrete.com",
  originCep: (process.env.SUPERFRETE_CEP_ORIGEM ?? "").replace(/\D/g, ""),
  siteUrl: (process.env.SITE_URL ?? "https://breck-importsv2.vercel.app").replace(/\/$/, ""),
  storeEmail: process.env.LOJA_EMAIL ?? "contato@breckimports.com.br",
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

/** Remonta o carrinho com os preços do catálogo: o preço nunca vem do navegador */
export function priceItems(items: CartInput[]) {
  return items.map((i) => {
    const product = getProduct(i.slug);
    if (!product) throw new Error(`Produto não encontrado: ${i.slug}`);
    const quantity = Math.max(1, Math.min(10, Math.floor(i.quantity)));
    return { product, size: String(i.size), quantity };
  });
}

/** Caixa de uma chuteira; cada par a mais empilha na altura */
export function packageFor(pairs: number) {
  return { height: 12 * pairs, width: 22, length: 33, weight: 1 * pairs };
}

export const SF_SERVICES = "1,2,17"; // PAC, SEDEX e Mini Envios

export async function superfrete(path: string, body: unknown) {
  const res = await fetch(`${env.sfApi}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.sfToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `Breck Imports (${env.storeEmail})`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`SuperFrete ${res.status}: ${JSON.stringify(data)}`);
  return data;
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

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
