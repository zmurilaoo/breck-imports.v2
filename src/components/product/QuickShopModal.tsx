import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { useUI } from "../../context/ui-context";
import { getProduct } from "../../data/catalog";
import { useLockBody } from "../../hooks/useLockBody";
import type { Product } from "../../types";
import { CloseIcon } from "../Icons";
import { PriceBlock } from "./PriceBlock";
import { SizeSelector } from "./SizeSelector";

function QuickShopContent({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const submit = () => {
    if (!size) {
      setError(true);
      return;
    }
    add(product.slug, size);
    onClose();
  };

  return (
    <div className="quickshop">
      <div className="quickshop-image">
        <img src={product.images[0]} alt={product.name} />
      </div>
      <div className="quickshop-info">
        <h2 className="quickshop-title">{product.name}</h2>
        <PriceBlock product={product} large />
        <SizeSelector
          sizes={product.sizes}
          value={size}
          error={error}
          onChange={(s) => {
            setSize(s);
            setError(false);
          }}
        />
        <button type="button" className="btn btn-primary btn-block" onClick={submit}>
          Adicionar ao carrinho
        </button>
        <Link to={`/produtos/${product.slug}`} className="btn-link" onClick={onClose}>
          Ver detalhes do produto
        </Link>
      </div>
    </div>
  );
}

export function QuickShopModal() {
  const { quickShopSlug, closeQuickShop } = useUI();
  const product = quickShopSlug ? getProduct(quickShopSlug) : undefined;
  const close = useCallback(() => closeQuickShop(), [closeQuickShop]);
  useLockBody(!!product, close);

  if (!product) return null;
  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-label={`Compra rápida de ${product.name}`}>
      <div className="overlay is-visible" onClick={close} aria-hidden />
      <div className="modal">
        <button type="button" className="icon-btn modal-close" aria-label="Fechar" onClick={close}>
          <CloseIcon size={22} />
        </button>
        <QuickShopContent key={product.slug} product={product} onClose={close} />
      </div>
    </div>
  );
}
