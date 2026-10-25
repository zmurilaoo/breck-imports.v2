import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useUI } from "../../context/ui-context";
import { contact, mobileNav } from "../../data/site";
import { useLockBody } from "../../hooks/useLockBody";
import type { NavLink } from "../../types";
import { ChevronDown, CloseIcon, InstagramIcon, GlobeIcon, PhoneIcon, UserIcon, WhatsAppIcon } from "../Icons";

function MenuItems({ items, onNavigate, depth = 0 }: { items: NavLink[]; onNavigate: () => void; depth?: number }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  return (
    <ul className={`mobile-nav-list depth-${depth}`}>
      {items.map((item) => {
        const expanded = openLabel === item.label;
        return (
          <li key={item.label}>
            <div className="mobile-nav-row">
              <Link to={item.to} onClick={onNavigate}>
                {item.label}
              </Link>
              {item.children && (
                <button
                  type="button"
                  aria-label={`${expanded ? "Fechar" : "Abrir"} ${item.label}`}
                  aria-expanded={expanded}
                  className={`mobile-nav-toggle${expanded ? " is-open" : ""}`}
                  onClick={() => setOpenLabel(expanded ? null : item.label)}
                >
                  <ChevronDown size={18} />
                </button>
              )}
            </div>
            {item.children && expanded && <MenuItems items={item.children} onNavigate={onNavigate} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

export function MobileMenu() {
  const { menuOpen, setMenuOpen } = useUI();
  const close = useCallback(() => setMenuOpen(false), [setMenuOpen]);
  useLockBody(menuOpen, close);

  return (
    <>
      <div className={`overlay${menuOpen ? " is-visible" : ""}`} onClick={close} aria-hidden />
      <aside className={`drawer drawer-left${menuOpen ? " is-open" : ""}`} aria-label="Menu" inert={!menuOpen}>
        <div className="drawer-header">
          <span className="drawer-title">Menu</span>
          <button type="button" className="icon-btn" aria-label="Fechar menu" onClick={close}>
            <CloseIcon size={22} />
          </button>
        </div>
        <div className="drawer-body">
          {menuOpen && <MenuItems items={mobileNav} onNavigate={close} />}
          <div className="mobile-account">
            <UserIcon size={18} />
            <Link to="/conta/cadastro" onClick={close}>
              Cadastre-se
            </Link>
            <span>|</span>
            <Link to="/conta/login" onClick={close}>
              Fazer login
            </Link>
          </div>
          <div className="mobile-contacts">
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={16} /> WhatsApp
            </a>
            <a href={contact.phoneHref}>
              <PhoneIcon size={16} /> {contact.phoneShort}
            </a>
            <a href={contact.siteUrl} target="_blank" rel="noreferrer">
              <GlobeIcon size={16} /> {contact.site}
            </a>
            <div className="mobile-social">
              <a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramIcon size={20} />
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
