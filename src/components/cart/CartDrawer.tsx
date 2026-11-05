import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { contact } from "../../data/site";
import { useLockBody } from "../../hooks/useLockBody";
import { useBadgeBounce } from "../../hooks/useBadgeBounce";
import { formatPrice, MAX_INSTALLMENTS } from "../../utils/format";
import { AnimatedPrice } from "../checkout/AnimatedNumber";
import { PaymentMethods } from "../product/PaymentMethods";
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "../Icons";

export function CartDrawer() {
  const { lines, subtotal, isOpen, close, setQuantity, remove, count } = useCart();
  const [cep, setCep] = useState("");
  const [shipping, setShipping] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<{ id: number; name: string; price: number; days: number }[]>([]);
  const [quoting, setQuoting] = useState(false);
  useLockBody(isOpen, close);
  useBadgeBounce(count);

  // Mesma cotação real do checkout (SuperFrete), só pra o cliente ter noção antes de finalizar
  const calcShipping = async () => {
    const digits = cep.replace(/\D/g, "");
    setQuotes([]);
    if (digits.length !== 8) return setShipping("Digite um CEP válido com 8 dígitos.");
    setShipping(null);
    setQuoting(true);
    try {
      const r = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digits, items: lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity })) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.options?.length) throw new Error(data.error);
      setQuotes(data.options);
    } catch (e) {
      setShipping((e as Error).message || "Não foi possível calcular o frete agora. Tente no checkout.");
    } finally {
      setQuoting(false);
    }
  };

  const checkoutMessage = encodeURIComponent(
    [
      "Olá! Quero finalizar meu pedido:",
      ...lines.map((l) => `• ${l.quantity}x ${l.product.name} — Tam. ${l.size} — ${formatPrice(l.product.price * l.quantity)}`),
      `Total: ${formatPrice(subtotal)} + frete`,
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
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"))}
                    onKeyDown={(e) => e.key === "Enter" && calcShipping()}
                  />
                  <button type="button" className="btn btn-outline" onClick={calcShipping} disabled={quoting}>
                    {quoting ? <span className="spinner" aria-label="Calculando" /> : "Calcular"}
                  </button>
                </div>
                {quoting && (
                  <div role="status" aria-label="Calculando frete">
                    <div className="skeleton cart-ship-skeleton" />
                    <div className="skeleton cart-ship-skeleton" />
                  </div>
                )}
                {shipping && <p className="cart-shipping-result">{shipping}</p>}
                {quotes.map((q) => (
                  <p key={q.id} className="cart-shipping-result cart-shipping-quote">
                    <span>
                      <strong>{q.name}</strong>
                      {q.days > 0 && <> · {q.days === 1 ? "até 1 dia útil" : `até ${q.days} dias úteis`}</>}
                    </span>
                    <strong>{q.id === 0 ? "a combinar" : formatPrice(q.price)}</strong>
                  </p>
                ))}
              </div>
              <div className="cart-total">
                <span>Subtotal</span>
                <strong><AnimatedPrice value={subtotal} /></strong>
              </div>
              <p className="cart-total-pix">
                Frete calculado no checkout · até {MAX_INSTALLMENTS}x no cartão
              </p>
              <Link to="/checkout" className="btn btn-primary btn-block" onClick={close}>
                Finalizar compra
              </Link>
              <PaymentMethods variant="compact" />
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
