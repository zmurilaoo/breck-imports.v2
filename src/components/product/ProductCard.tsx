import { useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useUI } from "../../context/ui-context";
import type { Product } from "../../types";
import { discountPercent } from "../../utils/format";
import { CartIcon } from "../Icons";
import { PriceBlock } from "./PriceBlock";

export function ProductCard({ product }: { product: Product }) {
  const { openQuickShop } = useUI();
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const discount = discountPercent(product);
  const { images } = product;
  const multi = images.length > 1;

  const [active, setActive] = useState(0);
  // As outras fotos só são baixadas quando a pessoa interage com o card
  const [warm, setWarm] = useState(false);
  // Ponto de zoom: a foto aproxima seguindo o mouse
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  const go = (i: number) => setActive((i + images.length) % images.length);

  return (
    <article className="product-card">
      <div
        className={`product-card-media${multi ? " is-gallery" : ""}`}
        onMouseEnter={() => setWarm(true)}
        onMouseLeave={() => {
          setActive(0);
          setOrigin({ x: 50, y: 50 });
        }}
      >
        <Link
          to={`/produtos/${product.slug}`}
          className="product-card-image"
          aria-label={product.name}
          style={{ "--ox": `${origin.x}%`, "--oy": `${origin.y}%` } as CSSProperties}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
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
          <div className="labels">
            {soldOut && <span className="label label-muted">Esgotado</span>}
            {discount && <span className="label">{discount}% OFF</span>}
            {product.label && <span className="label">{product.label}</span>}
          </div>
          {multi && (
            <div className="card-dots" aria-hidden="true">
              {images.map((src, i) => (
                <span key={src} className={i === active ? "is-active" : ""} />
              ))}
            </div>
          )}
        </Link>
        {/* Miniaturas que sobem no hover: passar o mouse troca a foto principal */}
        {multi && warm && (
          <div className="card-thumbs" aria-hidden="true">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                tabIndex={-1}
                className={i === active ? "is-active" : ""}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
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
