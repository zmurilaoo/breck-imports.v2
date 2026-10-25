import { useEffect, useRef, useState } from "react";
import { Link, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { useUI } from "../../context/ui-context";
import { contact, mainNav } from "../../data/site";
import type { NavLink } from "../../types";
import {
  CartIcon,
  ChevronDown,
  ChevronRight,
  InstagramIcon,
  GlobeIcon,
  MenuIcon,
  PhoneIcon,
  SearchIcon,
  UserIcon,
  WhatsAppIcon,
} from "../Icons";
import { SearchForm } from "./SearchForm";

function DesktopDropdown({ items }: { items: NavLink[] }) {
  return (
    <ul className="nav-dropdown">
      {items.map((item) => (
        <li key={item.label} className={item.children ? "has-children" : undefined}>
          <Link to={item.to} className="nav-dropdown-link">
            {item.label}
            {item.children && <ChevronRight size={14} />}
          </Link>
          {item.children && <DesktopDropdown items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

export function Header() {
  const { count, open: openCart } = useCart();
  const { setMenuOpen, setSearchOpen } = useUI();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  // Na home o cabeçalho fica transparente sobre o fundo do hero até a página rolar
  const overlay = location.pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Publica a altura do cabeçalho: o hero reserva esse espaço para a arte nunca ficar por baixo dele
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--site-header-h", `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={headerRef} className={`site-header${scrolled ? " is-scrolled" : ""}${overlay ? " is-overlay" : ""}`}>
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-contacts">
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={14} /> WhatsApp
            </a>
            <a href={contact.phoneHref}>
              <PhoneIcon size={14} /> {contact.phoneShort}
            </a>
            <a href={contact.siteUrl} target="_blank" rel="noreferrer">
              <GlobeIcon size={14} /> {contact.site}
            </a>
          </div>
          <div className="topbar-social">
            <a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="instagram Breck Imports">
              <InstagramIcon size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="container header-main-inner">
          <button type="button" className="icon-btn only-mobile" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
            <MenuIcon size={24} />
          </button>

          <Link to="/" className="logo" aria-label="Breck Imports — página inicial">
            {/* Mesma arte em duas camadas: o personagem se mexe, o letreiro fica parado */}
            <img src="/images/logo-breck.webp" alt="Breck Imports" width={437} height={436} className="logo-word" />
            <span className="logo-char" aria-hidden>
              <img src="/images/logo-breck.webp" alt="" width={437} height={436} />
              <span className="logo-glint" />
            </span>
          </Link>

          <div className="header-search only-desktop">
            <SearchForm key={location.pathname} />
          </div>

          <div className="header-actions">
            <button type="button" className="icon-btn only-mobile" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
              <SearchIcon size={22} />
            </button>
            <div className="account-links only-desktop">
              <UserIcon size={20} />
              <Link to="/conta/cadastro">Cadastre-se</Link>
              <span aria-hidden>|</span>
              <Link to="/conta/login">Fazer login</Link>
            </div>
            <button type="button" className="icon-btn cart-btn" aria-label={`Carrinho com ${count} itens`} onClick={openCart}>
              <CartIcon size={24} />
              <span className="cart-badge">{count}</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="main-nav only-desktop" aria-label="Menu principal">
        <ul className="container main-nav-list">
          {mainNav.map((item) => (
            <li key={item.label} className={item.children ? "has-children" : undefined}>
              <RouterNavLink to={item.to} end={item.to === "/"} className="main-nav-link">
                {item.label}
                {item.children && <ChevronDown size={14} />}
              </RouterNavLink>
              {item.children && <DesktopDropdown items={item.children} />}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
