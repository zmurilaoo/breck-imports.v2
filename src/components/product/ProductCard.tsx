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
  const [main, secondary] = product.images;

  return (
    <article className="product-card">
      <Link to={`/produtos/${product.slug}`} className="product-card-image" aria-label={product.name}>
        <img src={main} alt={product.name} loading="lazy" className="img-main" />
        {secondary && <img src={secondary} alt="" loading="lazy" className="img-secondary" aria-hidden />}
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
