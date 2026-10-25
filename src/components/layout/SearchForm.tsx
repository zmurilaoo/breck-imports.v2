import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchProducts } from "../../data/catalog";
import { formatPrice } from "../../utils/format";
import { CloseIcon, SearchIcon } from "../Icons";

interface Props {
  autoFocus?: boolean;
  onDone?: () => void;
}

export function SearchForm({ autoFocus, onDone }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const suggestions = useMemo(() => searchProducts(query).slice(0, 6), [query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/busca?q=${encodeURIComponent(q)}`);
    setFocused(false);
    onDone?.();
  };

  const showSuggestions = focused && query.trim().length > 1;

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
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
      />
      {query && (
        <button type="button" className="search-btn search-clear" aria-label="Limpar busca" onClick={() => setQuery("")}>
          <CloseIcon size={16} />
        </button>
      )}
      <button type="submit" className="search-btn" aria-label="Buscar">
        <SearchIcon size={18} />
      </button>

      {showSuggestions && (
        <div className="search-suggestions">
          {suggestions.length === 0 ? (
            <p className="search-empty">Nenhum produto encontrado para “{query}”.</p>
          ) : (
            <>
              {suggestions.map((p) => (
                <Link
                  key={p.slug}
                  to={`/produtos/${p.slug}`}
                  className="search-suggestion"
                  onClick={() => {
                    setQuery("");
                    onDone?.();
                  }}
                >
                  <img src={p.images[0]} alt="" loading="lazy" />
                  <span className="search-suggestion-name">{p.name}</span>
                  <strong>{formatPrice(p.price)}</strong>
                </Link>
              ))}
              <button type="submit" className="search-all">
                Ver todos os resultados
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
