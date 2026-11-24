// Esgotado em tempo real (sem rebuild): um registro JSON no Redis { slug: ["40", "41"] | ["*"] }.
// "*" = produto inteiro esgotado. Quem escreve: só /api/admin-stock (token do painel).
import { getProduct } from "../src/data/catalog";
import { dbReady, redis } from "./_lib";

export const STOCK_KEY = "brk:esgotado";
export type SoldOut = Record<string, string[]>;

export async function readSoldOut(): Promise<SoldOut> {
  if (!dbReady()) return {};
  const raw = await redis<string | null>("GET", STOCK_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as SoldOut) : {};
  } catch {
    return {};
  }
}

export const isSoldOut = (m: SoldOut, slug: string, size: string) => {
  const s = m[slug];
  return Boolean(s && (s.includes("*") || s.includes(size)));
};

/**
 * Confere o carrinho contra o esgotado. Falha aberta: se o Redis cair, a venda segue
 * (o catálogo estático continua valendo); esgotado é proteção de experiência, não de valor.
 */
export async function soldOutError(lines: { product: { slug: string; name: string }; size: string }[]): Promise<string | null> {
  const m = await readSoldOut().catch(() => ({}) as SoldOut);
  const hit = lines.find((l) => isSoldOut(m, l.product.slug, l.size));
  return hit ? `${hit.product.name} no tamanho ${hit.size} acabou de esgotar. Tire do carrinho ou escolha outro tamanho.` : null;
}

/** Marca (ou desmarca) um tamanho ou o produto inteiro (size = "*"). Valida contra o catálogo. */
export async function setSoldOut(slug: string, size: string, soldOut: boolean): Promise<SoldOut> {
  const p = getProduct(slug);
  if (!p) throw Object.assign(new Error("Produto não encontrado no catálogo"), { status: 404 });
  if (size !== "*" && !p.sizes.some((s) => s.size === size)) throw Object.assign(new Error("Esse tamanho não existe nesse produto"), { status: 400 });
  const m = await readSoldOut();
  const cur = new Set(m[slug] ?? []);
  if (soldOut) cur.add(size);
  else if (size === "*") cur.clear();
  else {
    cur.delete(size);
    cur.delete("*");
  }
  if (cur.size) m[slug] = [...cur].sort();
  else delete m[slug];
  await redis("SET", STOCK_KEY, JSON.stringify(m));
  return m;
}
