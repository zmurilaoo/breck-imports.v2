import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { banners, contact, faq, hero, homeCategories, services, testimonials } from "../../data/site";
import type { Banner, Product } from "../../types";
import { InstagramIcon, MinusIcon, PinIcon, PlusIcon, StarIcon, WhatsAppIcon } from "../Icons";
import { ProductCard } from "../product/ProductCard";
import { Carousel } from "../ui/Carousel";
import { BrandBanner } from "./BrandBanner";
import { useInView } from "../../hooks/useInView";

export function Hero() {
  return (
    <section className="hero" aria-label="Destaque" style={{ "--hero-img": `url(${hero.image})` } as CSSProperties}>
      <Link to={hero.to} className="hero-banner">
        <img src={hero.image} alt={hero.alt} fetchPriority="high" />
        <span className="hero-shine" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function ServiceBanners() {
  return (
    <section className="services" aria-label="Vantagens">
      <div className="container">
        <Carousel variant="services" label="Vantagens da loja" dots>
          {services.map((s) => {
            const content = (
              <>
                <span className="service-icon-tile">
                  <img src={s.icon} alt="" className="service-icon" loading="lazy" />
                </span>
                <div>
                  <h3 className="service-title">{s.title}</h3>
                  <p className="service-text">{s.text}</p>
                </div>
              </>
            );
            if (s.to) return <Link key={s.title} to={s.to} className="service-item">{content}</Link>;
            if (s.href)
              return (
                <a key={s.title} href={s.href} target="_blank" rel="noreferrer" className="service-item">
                  {content}
                </a>
              );
            return <div key={s.title} className="service-item">{content}</div>;
          })}
        </Carousel>
      </div>
    </section>
  );
}

export function CategoryCarousel() {
  const [ref, inView] = useInView<HTMLElement>(0.3);
  return (
    <section
      ref={ref}
      className={`section home-categories${inView ? " is-live" : ""}`}
      aria-label="Categorias"
    >
      {/* Filtro que deforma o fundo das bolinhas em chamas */}
      <svg className="cat-fire-defs" aria-hidden="true">
        <filter id="cat-fire">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.11" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="32" />
        </filter>
      </svg>
      <div className="container">
        <p className="cat-shout cat-shout-title">
          <CrownIcon />
          Escolhe a sua!
        </p>
        <Carousel variant="categories" label="Categorias">
          {homeCategories.map((c, i) => (
            <Link
              key={c.name}
              to={c.to}
              className="home-category"
              aria-label={c.name}
              style={{ "--i": i } as CSSProperties}
            >
              <div className="home-category-image">
                <span className="home-category-shoe">
                  <img src={c.image} alt="" loading="lazy" />
                </span>
              </div>
              <span className="home-category-name">{c.name}</span>
            </Link>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/** Coroinha desenhada à mão, igual às do hero */
function CrownIcon({ className = "cat-crown" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 30" aria-hidden="true">
      <path d="M4 26 2 6l11 9L20 2l7 13 11-9-2 20Z" />
    </svg>
  );
}

interface ProductSectionProps {
  products: Product[];
  label: string;
  title?: string;
  subtitle?: string;
  /** Um ou mais banners empilhados acima dos produtos */
  banner?: Banner | Banner[];
  cta?: { label: string; to: string };
}

export function ProductSection({ products, label, title, subtitle, banner, cta }: ProductSectionProps) {
  const bannerList = banner ? ([] as Banner[]).concat(banner) : [];
  return (
    <section className="section product-section" aria-label={label}>
      {bannerList.length === 1 && <BrandBanner banner={bannerList[0]} className="section-banner" />}
      {/* Mais de um banner: mesmo lugar, com setas para trocar */}
      {bannerList.length > 1 && (
        <div className="section-banner banner-slider">
          <Carousel variant="hero" label={`Banners — ${label}`} dots>
            {bannerList.map((b) => (
              <BrandBanner key={b.image} banner={b} />
            ))}
          </Carousel>
        </div>
      )}
      <div className="container">
        {title && (
          <div className="section-title">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        <Carousel label={label}>
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </Carousel>
        {cta && (
          <div className="section-cta">
            <Link to={cta.to} className="btn btn-primary">
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function PromoProducts({ products }: { products: Product[] }) {
  return (
    <section className="section promo-products" aria-label="Esportes e academia">
      <div className="container promo-products-inner">
        <div className="promo-products-list">
          <Carousel label="Esportes e academia">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

export function GridBanner() {
  return (
    <section className="section grid-banner" aria-label="Entrega expressa">
      <div className="container">
        <BrandBanner banner={banners.entrega} />
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="section faq" aria-labelledby="faq-title">
      <div className="container container-narrow">
        <div className="section-title">
          <h2 id="faq-title">COMPRE SEM DÚVIDAS</h2>
          <p>FAQ | Breck Imports</p>
        </div>
        <div className="faq-list">
          {faq.map((item, i) => {
            const expanded = open === i;
            return (
              <div className={`faq-item${expanded ? " is-open" : ""}`} key={item.q}>
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={expanded}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(expanded ? null : i)}
                >
                  <span>{item.q}</span>
                  {expanded ? <MinusIcon size={18} /> : <PlusIcon size={18} />}
                </button>
                <div className="faq-answer" id={`faq-${i}`} hidden={!expanded}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="section testimonials" aria-labelledby="testimonials-title">
      <div className="container">
        <div className="section-title">
          <h2 id="testimonials-title">CLIENTES DA BRECK IMPORTS</h2>
          <p>Confira alguns feedbacks de nossos clientes</p>
        </div>
        <Carousel variant="testimonials" label="Depoimentos de clientes" dots>
          {testimonials.map((t) => (
            <figure className="testimonial" key={t.name}>
              <img src={t.image} alt={t.name} className="testimonial-image" loading="lazy" />
              <div className="testimonial-stars" aria-label="5 de 5 estrelas">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <blockquote>“{t.text}”</blockquote>
              <figcaption>{t.name}</figcaption>
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/** Foto da loja física: inclina seguindo o mouse, com chamada para visitar e falar no WhatsApp */
export function StoreSection() {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  const visitMessage = encodeURIComponent(
    "Olá, Breck Imports! Vi a loja de vocês no site e quero passar aí pra conhecer. Qual o horário de hoje?",
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address + ", São Paulo")}`;

  return (
    <section className="section store-section" aria-label="Nossa loja">
      <div className="container store-inner">
        <div
          className={`store-photo${tilt.active ? " is-tilting" : ""}`}
          style={{ "--rx": `${tilt.y * -8}deg`, "--ry": `${tilt.x * 10}deg`, "--mx": `${(tilt.x + 0.5) * 100}%`, "--my": `${(tilt.y + 0.5) * 100}%` } as CSSProperties}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5, active: true });
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0, active: false })}
        >
          <img src="/images/loja-breck.webp" alt="Fachada da loja Breck Imports com a parede cheia de chuteiras" loading="lazy" />
          <span className="store-photo-shine" aria-hidden="true" />
          <span className="store-badge">
            <PinIcon size={14} /> Loja física
          </span>
        </div>
        <div className="store-info">
          <p className="cat-shout store-shout">
            <CrownIcon />
            Vem pra loja!
          </p>
          <h2>Conheça a Breck Imports pessoalmente</h2>
          <p className="store-text">
            Parede cheia de chuteiras pra você ver de perto, calçar e sair jogando. Chama no WhatsApp e já garante a sua.
          </p>
          <ul className="store-details">
            <li>
              <PinIcon size={18} />
              <span>{contact.address}</span>
            </li>
            <li>
              <WhatsAppIcon size={18} />
              <span>{contact.phoneDisplay}</span>
            </li>
          </ul>
          <div className="store-actions">
            <a className="btn btn-primary store-btn" href={`${contact.whatsappUrl}?text=${visitMessage}`} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={18} /> Chamar no WhatsApp
            </a>
            <a className="btn store-btn store-btn-ghost" href={mapsUrl} target="_blank" rel="noreferrer">
              <PinIcon size={18} /> Como chegar
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InstagramSection() {
  return (
    <section className="section instafeed">
      <div className="container instafeed-inner">
        <a href={contact.instagram} target="_blank" rel="noreferrer" aria-label={contact.instagramHandle} className="instafeed-icon">
          <InstagramIcon size={36} />
        </a>
        <span>Siga-nos no Instagram</span>
        <a href={contact.instagram} target="_blank" rel="noreferrer" className="instafeed-title">
          {contact.instagramHandle}
        </a>
      </div>
    </section>
  );
}
