import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useUI } from "../../context/ui-context";
import type { Product } from "../../types";
import { discountPercent } from "../../utils/format";
import { CartIcon, ChevronLeft, ChevronRight } from "../Icons";
import { PriceBlock } from "./PriceBlock";

/** Tempo de cada ângulo na troca automática do celular (ms) */
const ANGLE_MS = 2200;

export function ProductCard({ product }: { product: Product }) {
  const { openQuickShop } = useUI();
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const discount = discountPercent(product);
  const { images } = product;
  const multi = images.length > 1;

  // null = foto padrão (1ª, ou 2ª com o mouse em cima); número = escolhida pelas setas
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  // No celular não tem hover: enquanto o card está na tela, ele alterna sozinho entre os dois ângulos
  const [autoAngle, setAutoAngle] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const active = picked ?? ((hover || autoAngle) && multi ? 1 : 0);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !multi || !window.matchMedia("(hover: none)").matches) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (!entry.isIntersecting) return setAutoAngle(false);
        timer = window.setInterval(() => setAutoAngle((a) => !a), ANGLE_MS);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [multi]);

  const step = (dir: number) => (e: MouseEvent) => {
    e.preventDefault();
    setPicked((active + dir + images.length) % images.length);
  };

  return (
    <article className="product-card" ref={cardRef}>
      <Link
        to={`/produtos/${product.slug}`}
        className="product-card-image"
        aria-label={product.name}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setPicked(null);
        }}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? product.name : ""}
            aria-hidden={i !== 0 || undefined}
            loading="lazy"
            className={`card-slide${i === active ? " is-active" : ""}`}
          />
        ))}
        {multi && (
          <>
            <button type="button" className="card-arrow card-arrow-prev" aria-label="Foto anterior" onClick={step(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="card-arrow card-arrow-next" aria-label="Próxima foto" onClick={step(1)}>
              <ChevronRight size={18} />
            </button>
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
