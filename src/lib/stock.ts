// Esgotado em tempo real: o painel marca, a loja lê /api/estoque e aplica por cima do catálogo.
// Uma busca por visita (cache em memória); se falhar, vale o catálogo estático.
import { useEffect, useMemo, useState } from "react";
import { contact } from "../data/site";
import type { Product } from "../types";

export type SoldOutMap = Record<string, string[]>;

let cache: SoldOutMap | null = null;
let pending: Promise<SoldOutMap> | null = null;

function load(): Promise<SoldOutMap> {
  pending ??= fetch("/api/estoque")
    .then((r) => (r.ok ? r.json() : { soldOut: {} }))
    .then((j: { soldOut?: SoldOutMap }) => (cache = j.soldOut && typeof j.soldOut === "object" ? j.soldOut : {}))
    .catch(() => (cache = {}));
  return pending;
}

export function useStock(): SoldOutMap {
  const [m, setM] = useState<SoldOutMap>(cache ?? {});
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setM(v));
    return () => {
      alive = false;
    };
  }, []);
  return m;
}

/** Produto com a disponibilidade dos tamanhos já ajustada pelo esgotado do painel. */
export function applyStock(p: Product, m: SoldOutMap): Product {
  const out = m[p.slug];
  if (!out?.length) return p;
  const all = out.includes("*");
  return { ...p, sizes: p.sizes.map((s) => (all || out.includes(s.size) ? { ...s, available: false } : s)) };
}

export function useStockProduct<T extends Product | undefined>(p: T): T {
  const m = useStock();
  return useMemo(() => (p ? applyStock(p, m) : p) as T, [p, m]);
}

export const isProductSoldOut = (p: Product) => p.sizes.length > 0 && p.sizes.every((s) => !s.available);

/** Link de "Avise-me quando voltar": abre o WhatsApp da loja com a mensagem pronta (sem guardar dado do cliente). */
export const notifyUrl = (p: Product, size?: string | null) =>
  `${contact.whatsappUrl}?text=${encodeURIComponent(`Oi, Breck! Quero ser avisado quando a ${p.name}${size ? ` no tamanho ${size}` : ""} voltar ao estoque.`)}`;
