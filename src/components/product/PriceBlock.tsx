import type { Product } from "../../types";
import { formatPrice, MAX_INSTALLMENTS, pixPrice } from "../../utils/format";
import { CreditCardIcon } from "../Icons";

export function PriceBlock({ product, large }: { product: Product; large?: boolean }) {
  return (
    <div className={`price-block${large ? " price-block-lg" : ""}`}>
      <div className="price-main">
        {product.comparePrice && product.comparePrice > product.price && (
          <span className="price-compare">{formatPrice(product.comparePrice)}</span>
        )}
        <span className="price">{formatPrice(product.price)}</span>
      </div>
      <div className="price-pix">
        <strong>{formatPrice(pixPrice(product.price))}</strong> com Pix
      </div>
      <div className="price-installments">
        <CreditCardIcon size={14} />
        <span>
          <strong>{MAX_INSTALLMENTS}</strong>x de <strong>{formatPrice(product.installment12)}</strong>
        </span>
      </div>
    </div>
  );
}
