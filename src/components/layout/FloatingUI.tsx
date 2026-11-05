import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { contact } from "../../data/site";
import { formatPrice } from "../../utils/format";
import { CloseIcon, WhatsAppIcon } from "../Icons";

const COOKIE_KEY = "breck-cookies-accepted";

export function CookieBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_KEY) !== "1";
    } catch {
      return true;
    }
  });
  // Não disputa espaço com formulário de compra
  const hidden = !visible || pathname.startsWith("/checkout");
  useEffect(() => {
    document.body.classList.toggle("has-cookie-bar", !hidden);
    return () => document.body.classList.remove("has-cookie-bar");
  }, [hidden]);
  if (hidden) return null;
  return (
    <div className="cookie-banner" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para melhorar sua compra. <Link to="/pagina/politica-de-privacidade">Saiba mais</Link>
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          try {
            localStorage.setItem(COOKIE_KEY, "1");
          } catch {
            /* sem storage */
          }
          setVisible(false);
        }}
      >
        Ok
      </button>
    </div>
  );
}

export function WhatsAppButton() {
  return (
    <a
      className="whatsapp-float"
      href={`${contact.whatsappUrl}?text=${encodeURIComponent(contact.whatsappMessage)}`}
      target="_blank" rel="noreferrer" aria-label="Fale conosco pelo WhatsApp">
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
