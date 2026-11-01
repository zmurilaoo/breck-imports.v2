import { paymentLogos } from "../../data/site";
import { MAX_INSTALLMENTS } from "../../utils/format";

type Variant = "full" | "compact";

const cardBrands = paymentLogos.filter((n) => n !== "pix" && n !== "boleto");

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Meios aceitos pelo Checkout Pro do Mercado Pago (nenhum é excluído em server/checkout.ts). */
export function PaymentMethods({ variant = "full", secureSeal = false }: { variant?: Variant; secureSeal?: boolean }) {
  if (variant === "compact") {
    return (
      <div className="pay-methods pay-methods-compact" aria-label="Formas de pagamento aceitas">
        <span>Pix · Crédito {MAX_INSTALLMENTS}x · Débito · Boleto</span>
        <div className="pay-logos-row">
          {paymentLogos.map((name) => (
            <img key={name} src={`/images/pay-${name}.png`} alt={name} loading="lazy" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="pay-methods" aria-labelledby="pay-methods-title">
      <h3 id="pay-methods-title" className="pay-methods-title">Formas de pagamento</h3>
      <ul className="pay-methods-list">
        <li>
          <img src="/images/pay-pix.png" alt="" loading="lazy" />
          <span><strong>Pix</strong> aprovação na hora</span>
        </li>
        <li>
          <span className="pay-badge">{MAX_INSTALLMENTS}x</span>
          <span><strong>Cartão de crédito</strong> em até {MAX_INSTALLMENTS}x</span>
        </li>
        <li>
          <span className="pay-badge">DÉB</span>
          <span><strong>Cartão de débito</strong></span>
        </li>
        <li>
          <img src="/images/pay-boleto.png" alt="" loading="lazy" />
          <span><strong>Boleto</strong> bancário</span>
        </li>
      </ul>
      <div className="pay-logos-row" aria-label="Bandeiras aceitas">
        {cardBrands.map((name) => (
          <img key={name} src={`/images/pay-${name}.png`} alt={name} loading="lazy" />
        ))}
      </div>
      {secureSeal && (
        <p className="pay-secure">
          <LockIcon /> Pagamento seguro Mercado Pago
        </p>
      )}
    </section>
  );
}
