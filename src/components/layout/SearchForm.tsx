import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { products, searchProducts } from "../../data/catalog";
import { formatPrice } from "../../utils/format";
import { CloseIcon, SearchIcon } from "../Icons";

interface Props {
  autoFocus?: boolean;
  onDone?: () => void;
}

/** Atalhos de busca: os modelos que a galera mais procura na loja */
const POPULAR = ["Mercurial", "Phantom", "Predator", "F50", "Tiempo", "Puma Future", "Society", "Futsal", "Campo"];

/** Com a busca vazia, a lista mostra todas as chuteiras da loja */
const ALL_BOOTS = products.filter((p) => p.categories.some((c) => c.startsWith("chuteira")));

export function SearchForm({ autoFocus, onDone }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(!!autoFocus);
  const navigate = useNavigate();
  const typed = query.trim().length > 0;
  const results = useMemo(() => (typed ? searchProducts(query) : ALL_BOOTS), [query, typed]);

  const go = (q: string) => {
    navigate(`/busca?q=${encodeURIComponent(q)}`);
    setFocused(false);
    onDone?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) go(q);
  };

  const close = () => {
    setQuery("");
    setFocused(false);
    onDone?.();
  };

  return (
    <form className="search-form" onSubmit={submit} role="search">
      <input
        type="search"
        className="search-input"
        placeholder="Busque por modelos ou marcas."
        aria-label="Busque por modelos ou marcas."
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 200)}
        onKeyDown={(e) => e.key === "Escape" && setFocused(false)}
      />
      {query && (
        <button type="button" className="search-btn search-clear" aria-label="Limpar busca" onClick={() => setQuery("")}>
          <CloseIcon size={16} />
        </button>
      )}
      <button type="submit" className="search-btn" aria-label="Buscar">
        <SearchIcon size={18} />
      </button>

      {focused && (
        // onMouseDown evita que o input perca o foco antes do clique numa sugestão
        <div className="search-suggestions" onMouseDown={(e) => e.preventDefault()}>
          <p className="search-label">Mais procuradas</p>
          <div className="search-chips">
            {POPULAR.map((term) => (
              <button type="button" key={term} className="search-chip" onClick={() => go(term)}>
                {term}
              </button>
            ))}
          </div>

          <p className="search-label">
            {typed ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : `Todas as chuteiras (${results.length})`}
          </p>
          {results.length === 0 ? (
            <p className="search-empty">Nenhum produto encontrado para “{query}”.</p>
          ) : (
            <div className="search-results">
              {results.map((p) => (
                <Link key={p.slug} to={`/produtos/${p.slug}`} className="search-suggestion" onClick={close}>
                  <img src={p.images[0]} alt="" loading="lazy" />
                  <span className="search-suggestion-name">{p.name}</span>
                  <strong>{formatPrice(p.price)}</strong>
                </Link>
              ))}
            </div>
          )}
          {typed && results.length > 0 && (
            <button type="submit" className="search-all">
              Ver todos os resultados
            </button>
          )}
        </div>
      )}
    </form>
  );
}
