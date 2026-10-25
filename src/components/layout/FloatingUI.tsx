import { useState } from "react";
import { useCart } from "../../context/cart-context";
import { contact } from "../../data/site";
import { formatPrice } from "../../utils/format";
import { CloseIcon, WhatsAppIcon } from "../Icons";

const COOKIE_KEY = "breck-cookies-accepted";

export function CookieBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(COOKIE_KEY) !== "1");
  if (!visible) return null;
  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <p>Ao navegar por este site você aceita o uso de cookies para agilizar a sua experiência de compra.</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          localStorage.setItem(COOKIE_KEY, "1");
          setVisible(false);
        }}
      >
        Aceitar e fechar
      </button>
    </div>
  );
}

export function WhatsAppButton() {
  return (
    <a className="whatsapp-float" href={contact.whatsappUrl} target="_blank" rel="noreferrer" aria-label="Fale conosco pelo WhatsApp">
      <WhatsAppIcon size={30} />
    </a>
  );
}

export function AddedToCartToast() {
  const { lastAdded, dismissToast, isOpen, open } = useCart();
  if (!lastAdded || isOpen) return null;
  return (
    <div className="toast" role="status">
      <img src={lastAdded.product.images[0]} alt="" />
      <div className="toast-info">
        <strong>Produto adicionado ao carrinho!</strong>
        <span>
          {lastAdded.product.name} · Tam. {lastAdded.size}
        </span>
        <span>{formatPrice(lastAdded.product.price)}</span>
        <button type="button" className="btn-link" onClick={open}>
          Ver carrinho
        </button>
      </div>
      <button type="button" className="icon-btn" aria-label="Fechar aviso" onClick={dismissToast}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
