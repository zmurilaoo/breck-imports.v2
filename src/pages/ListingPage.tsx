import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/product/ProductCard";
import { getByCategory, products, searchProducts } from "../data/catalog";
import { categoryNames } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Product } from "../types";

type Sort = "relevance" | "price-asc" | "price-desc" | "name";

const sorters: Record<Sort, ((a: Product, b: Product) => number) | null> = {
  relevance: null,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
};

interface Props {
  mode: "all" | "category" | "search";
}

export function ListingPage({ mode }: Props) {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const rawSort = params.get("ordem");
  const sort: Sort = rawSort && rawSort in sorters ? (rawSort as Sort) : "relevance";

  const title =
    mode === "search" ? `Resultados para “${query}”` : mode === "category" ? (categoryNames[slug] ?? slug) : "Produtos";
  usePageTitle(mode === "search" ? `Busca: ${query}` : title);

  const list = useMemo(() => {
    const base = mode === "search" ? searchProducts(query) : mode === "category" ? getByCategory(slug) : products;
    const sorter = sorters[sort];
    return sorter ? [...base].sort(sorter) : base;
  }, [mode, query, slug, sort]);

  return (
    <div className="container listing">
      <nav className="breadcrumbs" aria-label="Você está em">
        <Link to="/">Início</Link>
        <span>/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="listing-header">
        <div>
          <h1>{title}</h1>
          <p>
            {list.length} {list.length === 1 ? "produto" : "produtos"}
          </p>
        </div>
        <label className="listing-sort">
          Ordenar por
          <select
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("ordem", e.target.value);
              setParams(next, { replace: true });
            }}
          >
            <option value="relevance">Mais relevantes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name">A - Z</option>
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <div className="listing-empty">
          <p>
            {mode === "search"
              ? "Não encontramos produtos com esse termo. Tente buscar por outro modelo ou marca."
              : "Em breve novos modelos nesta categoria. Fale com a gente no WhatsApp para verificar disponibilidade!"}
          </p>
          <Link to="/produtos" className="btn btn-primary">
            Ver todos os produtos
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
