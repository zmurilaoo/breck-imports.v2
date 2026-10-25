import { Link } from "react-router-dom";
import { contact, footerNav, institutionalNav, paymentLogos } from "../../data/site";
import { InstagramIcon, GlobeIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../Icons";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/images/logo-breck.webp" alt="Breck Imports" width={437} height={436} loading="lazy" />
          <div className="footer-social">
            <a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="instagram Breck Imports">
              <InstagramIcon size={20} />
            </a>
          </div>
        </div>

        <nav className="footer-col" aria-label="Navegação">
          <h4 className="footer-title">Navegação</h4>
          <ul>
            {footerNav.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label="Institucional">
          <h4 className="footer-title">Institucional</h4>
          <ul>
            {institutionalNav.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h4 className="footer-title">Entre em contato</h4>
          <ul className="footer-contact">
            <li>
              <WhatsAppIcon size={16} />
              <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
                {contact.phoneDisplay}
              </a>
            </li>
            <li>
              <PhoneIcon size={16} />
              <a href={contact.phoneHref}>{contact.phoneShort}</a>
            </li>
            <li>
              <GlobeIcon size={16} />
              <a href={contact.siteUrl} target="_blank" rel="noreferrer">{contact.site}</a>
            </li>
            <li>
              <PinIcon size={16} />
              <span>{contact.address}</span>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Formas de pagamento</h4>
          <div className="payment-logos">
            {paymentLogos.map((name) => (
              <img key={name} src={`/images/pay-${name}.png`} alt={name} loading="lazy" />
            ))}
          </div>
          <h4 className="footer-title">Segurança</h4>
          <a
            href="https://transparencyreport.google.com/safe-browsing/search"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/images/google-safe.png" alt="Selo Google Safe Browsing" className="security-seal" loading="lazy" />
          </a>
        </div>
      </div>

      <div className="footer-legal">
        <div className="container footer-legal-inner">
          <div>
            <strong>Breck Imports</strong>
            <p>©{YEAR}. Breck Imports. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
