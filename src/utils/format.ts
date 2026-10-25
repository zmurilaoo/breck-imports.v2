import type { Product } from "../types";

export const PIX_DISCOUNT = 0.05;
export const MAX_INSTALLMENTS = 12;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(value: number): string {
  // Intl insere um espaço não separável depois de "R$"; o site original exibe "R$349,00".
  return brl.format(value).replace(/\s/g, "");
}

export function pixPrice(price: number): number {
  return Math.round(price * (1 - PIX_DISCOUNT) * 100) / 100;
}

export function discountPercent(product: Product): number | null {
  if (!product.comparePrice || product.comparePrice <= product.price) return null;
  return Math.round((1 - product.price / product.comparePrice) * 100);
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
