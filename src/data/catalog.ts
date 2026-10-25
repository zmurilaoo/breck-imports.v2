import type { Product } from "../types";
import { normalize } from "../utils/format";
import { homeSections, products } from "./products";

const bySlug = new Map(products.map((p) => [p.slug, p]));

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function getSection(key: keyof typeof homeSections): Product[] {
  return homeSections[key].map((slug) => bySlug.get(slug)).filter((p): p is Product => !!p);
}

export function getByCategory(category: string): Product[] {
  return products.filter((p) => p.categories.includes(category));
}

export function searchProducts(query: string): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const haystack = normalize(`${p.name} ${p.categories.join(" ")}`);
    return terms.every((t) => haystack.includes(t));
  });
}

export function getRelated(product: Product, limit = 8): Product[] {
  const main = product.categories[0];
  return products
    .filter((p) => p.slug !== product.slug && (main ? p.categories.includes(main) : true))
    .slice(0, limit);
}

export { products };
