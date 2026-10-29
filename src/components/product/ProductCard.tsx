import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useUI } from "../../context/ui-context";
import type { Product } from "../../types";
import { discountPercent } from "../../utils/format";
import { CartIcon } from "../Icons";
import { PriceBlock } from "./PriceBlock";

/** Tempo de cada foto no modo automático (ms) */
const SLIDE_MS = 1100;

export function ProductCard({ product }: { product: Product }) {
  const { openQuickShop } = useUI();
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const discount = discountPercent(product);
  const { images } = product;
  const multi = images.length > 1;

  const [active, setActive] = useState(0);
  // As outras fotos só são baixadas quando a pessoa interage com o card
  const [warm, setWarm] = useState(false);
  const [hovering, setHovering] = useState(false);
  const scrubbing = useRef(false);
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  // Com o mouse parado em cima, as fotos passam sozinhas (estilo stories)
  useEffect(() => {
    if (!hovering || !multi) return;
    const id = window.setInterval(() => {
      if (!scrubbing.current) setActive((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [hovering, multi, images.length]);

  const go = (i: number) => setActive((i + images.length) % images.length);

  return (
    <article className={`product-card${hovering ? " is-hover" : ""}`}>
      <Link
        to={`/produtos/${product.slug}`}
        className={`product-card-image${multi ? " is-gallery" : ""}`}
        aria-label={product.name}
        style={{ "--slide-ms": `${SLIDE_MS}ms` } as CSSProperties}
        onMouseEnter={() => {
          setWarm(true);
          setHovering(true);
        }}
        onMouseLeave={() => {
          setHovering(false);
          scrubbing.current = false;
          setActive(0);
        }}
        // Passar o mouse da esquerda pra direita "folheia" as fotos
        onMouseMove={(e) => {
          if (!multi) return;
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.min(images.length - 1, Math.floor(((e.clientX - r.left) / r.width) * images.length));
          if (i !== active) {
            scrubbing.current = true;
            setActive(i);
          }
        }}
        onTouchStart={(e) => {
          setWarm(true);
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !multi) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 30) {
            swiped.current = true;
            go(active + (dx < 0 ? 1 : -1));
          }
        }}
        onClick={(e) => {
          // Um arrasto no celular troca a foto em vez de abrir o produto
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
          }
        }}
      >
        {images.map((src, i) =>
          i === 0 || warm ? (
            <img
              key={src}
              src={src}
              alt={i === 0 ? product.name : ""}
              aria-hidden={i !== 0 || undefined}
              loading="lazy"
              className={`card-slide${i === active ? " is-active" : ""}`}
            />
          ) : null,
        )}
        {multi && (
          <>
            <span className="card-sweep" key={active} aria-hidden="true" />
            <div className="card-bars" aria-hidden="true">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={i < active ? "is-done" : i === active ? (hovering && !scrubbing.current ? "is-running" : "is-done") : ""}
                />
              ))}
            </div>
            <span className="card-count" aria-hidden="true">
              {active + 1}/{images.length}
            </span>
          </>
        )}
        <div className="labels">
          {soldOut && <span className="label label-muted">Esgotado</span>}
          {discount && <span className="label">{discount}% OFF</span>}
          {product.label && <span className="label">{product.label}</span>}
        </div>
      </Link>
      <div className="product-card-body">
        <Link to={`/produtos/${product.slug}`} className="product-card-name">
          {product.name}
        </Link>
        <PriceBlock product={product} />
        <button
          type="button"
          className="btn btn-primary btn-block product-card-buy"
          disabled={soldOut}
          aria-label={`Compra rápida de ${product.name}`}
          onClick={() => openQuickShop(product.slug)}
        >
          <CartIcon size={16} />
          {soldOut ? "Esgotado" : "Comprar"}
        </button>
      </div>
    </article>
  );
}
