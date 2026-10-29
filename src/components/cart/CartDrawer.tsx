import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { contact } from "../../data/site";
import { useLockBody } from "../../hooks/useLockBody";
import { formatPrice, MAX_INSTALLMENTS, pixPrice } from "../../utils/format";
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "../Icons";

export function CartDrawer() {
  const { lines, subtotal, isOpen, close, setQuantity, remove, count } = useCart();
  const [cep, setCep] = useState("");
  const [shipping, setShipping] = useState<string | null>(null);
  useLockBody(isOpen, close);

  const calcShipping = () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setShipping("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setShipping("Clique em Finalizar compra: lá aparecem PAC, SEDEX e Mini Envios com o valor certinho pro seu CEP.");
  };

  const checkoutMessage = encodeURIComponent(
    [
      "Olá! Quero finalizar meu pedido:",
      ...lines.map((l) => `• ${l.quantity}x ${l.product.name} — Tam. ${l.size} — ${formatPrice(l.product.price * l.quantity)}`),
      `Total: ${formatPrice(subtotal)} (${formatPrice(pixPrice(subtotal))} no Pix)`,
    ].join("\n"),
  );

  return (
    <>
      <div className={`overlay${isOpen ? " is-visible" : ""}`} onClick={close} aria-hidden />
      <aside className={`drawer drawer-right${isOpen ? " is-open" : ""}`} aria-label="Carrinho de compras" inert={!isOpen}>
        <div className="drawer-header">
          <span className="drawer-title">Carrinho de compras ({count})</span>
          <button type="button" className="icon-btn" aria-label="Fechar carrinho" onClick={close}>
            <CloseIcon size={22} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="cart-empty">
            <CartIcon size={48} />
            <p>O carrinho de compras está vazio.</p>
            <Link to="/produtos" className="btn btn-primary" onClick={close}>
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-body cart-lines">
              {lines.map((line) => (
                <div className="cart-line" key={`${line.slug}-${line.size}`}>
                  <Link to={`/produtos/${line.slug}`} onClick={close} className="cart-line-image">
                    <img src={line.product.images[0]} alt={line.product.name} loading="lazy" />
                  </Link>
                  <div className="cart-line-info">
                    <Link to={`/produtos/${line.slug}`} onClick={close} className="cart-line-name">
                      {line.product.name}
                    </Link>
                    <span className="cart-line-size">Tamanho: {line.size}</span>
                    <div className="cart-line-bottom">
                      <div className="qty">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          onClick={() => setQuantity(line.slug, line.size, line.quantity - 1)}
                        >
                          <MinusIcon size={14} />
                        </button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          onClick={() => setQuantity(line.slug, line.size, line.quantity + 1)}
                        >
                          <PlusIcon size={14} />
                        </button>
                      </div>
                      <strong>{formatPrice(line.product.price * line.quantity)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn cart-line-remove"
                    aria-label={`Remover ${line.product.name}`}
                    onClick={() => remove(line.slug, line.size)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-shipping">
                <label htmlFor="cart-cep">Calcular frete</label>
                <div className="cart-shipping-row">
                  <input
                    id="cart-cep"
                    inputMode="numeric"
                    placeholder="Seu CEP"
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                  <button type="button" className="btn btn-outline" onClick={calcShipping}>
                    Calcular
                  </button>
                </div>
                {shipping && <p className="cart-shipping-result">{shipping}</p>}
              </div>
              <div className="cart-total">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p className="cart-total-pix">
                ou <strong>{formatPrice(pixPrice(subtotal))}</strong> com Pix · até {MAX_INSTALLMENTS}x no cartão
              </p>
              <Link to="/checkout" className="btn btn-primary btn-block" onClick={close}>
                Finalizar compra
              </Link>
              <a className="btn-link" href={`${contact.whatsappUrl}?text=${checkoutMessage}`} target="_blank" rel="noreferrer">
                Prefere comprar pelo WhatsApp?
              </a>
              <button type="button" className="btn-link" onClick={close}>
                Ver mais produtos
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
