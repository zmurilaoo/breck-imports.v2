import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { banners, contact, faq, hero, homeCategories, services, testimonials } from "../../data/site";
import type { Banner, Product } from "../../types";
import { InstagramIcon, MinusIcon, PlusIcon, StarIcon } from "../Icons";
import { ProductCard } from "../product/ProductCard";
import { Carousel } from "../ui/Carousel";
import { BrandBanner } from "./BrandBanner";

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
  return (
    <section className="section home-categories" aria-label="Categorias">
      <div className="container">
        <Carousel variant="categories" label="Categorias">
          {homeCategories.map((c) => (
            <Link key={c.name} to={c.to} className="home-category">
              <div className="home-category-image">
                <img src={c.image} alt="" loading="lazy" />
              </div>
              <span className="home-category-name">{c.name}</span>
            </Link>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

interface ProductSectionProps {
  products: Product[];
  label: string;
  title?: string;
  subtitle?: string;
  banner?: Banner;
  cta?: { label: string; to: string };
}

export function ProductSection({ products, label, title, subtitle, banner, cta }: ProductSectionProps) {
  return (
    <section className="section product-section" aria-label={label}>
      {banner && <BrandBanner banner={banner} className="section-banner" />}
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
