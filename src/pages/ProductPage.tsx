import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreditCardIcon, TruckIcon, WhatsAppIcon } from "../components/Icons";
import { PaymentMethods } from "../components/product/PaymentMethods";
import { PriceBlock } from "../components/product/PriceBlock";
import { ProductCard } from "../components/product/ProductCard";
import { SizeSelector } from "../components/product/SizeSelector";
import { Carousel } from "../components/ui/Carousel";
import { useCart } from "../context/cart-context";
import { getProduct, getRelated } from "../data/catalog";
import { categoryNames, contact } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";
import type { Product } from "../types";
import { discountPercent } from "../utils/format";
import { flyToCart } from "../utils/flyToCart";
import { NotFoundPage } from "./NotFoundPage";

function ProductDetail({ product }: { product: Product }) {
  const { add, open } = useCart();
  const [image, setImage] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  // Feedback no próprio botão depois de adicionar (o toast confirma também)
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(addedTimer.current), []);
  usePageTitle(product.name);

  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const discount = discountPercent(product);
  const mainCategory = product.categories.find((c) => categoryNames[c]);
  const related = getRelated(product);

  const addToCart = (buyNow: boolean) => {
    if (!size) {
      setError(true);
      return;
    }
    add(product.slug, size, quantity);
    if (buyNow) return open();
    flyToCart(document.querySelector(".product-gallery-main img"));
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <>
      <div className="container">
        <nav className="breadcrumbs" aria-label="Você está em">
          <Link to="/">Início</Link>
          <span>/</span>
          {mainCategory && (
            <>
              <Link to={`/categoria/${mainCategory}`}>{categoryNames[mainCategory]}</Link>
              <span>/</span>
            </>
          )}
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="product-detail">
          <div className="product-gallery">
            <div className="product-gallery-main">
              <img key={product.images[image]} className="gallery-img-in" src={product.images[image]} alt={product.name} fetchPriority="high" decoding="async" />
              <div className="labels">
                {discount && <span className="label">{discount}% OFF</span>}
                {product.label && <span className="label">{product.label}</span>}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="product-thumbs">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={i === image ? "is-active" : undefined}
                    aria-label={`Ver imagem ${i + 1}`}
                    onClick={() => setImage(i)}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>
            <PriceBlock product={product} large />

            <SizeSelector
              sizes={product.sizes}
              value={size}
              error={error}
              onChange={(s) => {
                setSize(s);
                setError(false);
              }}
            />
            <Link to="/pagina/guia-de-medidas" className="btn-link">
              Guia de medidas
            </Link>

            <div className="product-buy">
              <div className="qty qty-lg">
                <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>
              <button
                type="button"
                className={`btn btn-primary btn-grow btn-add${added ? " is-added" : ""}`}
                disabled={soldOut}
                onClick={() => addToCart(false)}
              >
                {soldOut ? (
                  "Esgotado"
                ) : added ? (
                  <>
                    <svg className="btn-check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    Adicionado
                  </>
                ) : (
                  "Adicionar ao carrinho"
                )}
              </button>
            </div>
            <button type="button" className="btn btn-dark btn-block" disabled={soldOut} onClick={() => addToCart(true)}>
              Comprar agora
            </button>

            <PaymentMethods />

            <ul className="product-perks">
              <li>
                <TruckIcon size={18} /> Enviamos para todo o Brasil
              </li>
              <li>
                <CreditCardIcon size={18} /> Pix ou em até 12x no cartão
              </li>
              <li>
                <WhatsAppIcon size={18} />
                <a
                  href={`${contact.whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse no ${product.name}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tire suas dúvidas pelo WhatsApp
                </a>
              </li>
            </ul>

            <div className="product-description">
              <h2>Descrição</h2>
              <p>
                {product.name} com qualidade premium, pronta-entrega e envio para todo o Brasil. Produto conferido e
                embalado com cuidado pela equipe Breck Imports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section product-section" aria-label="Produtos similares">
          <div className="container">
            <div className="section-title">
              <h2>PRODUTOS SIMILARES</h2>
            </div>
            <Carousel label="Produtos similares">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </Carousel>
          </div>
        </section>
      )}
    </>
  );
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const product = getProduct(slug);
  if (!product) return <NotFoundPage />;
  // A key reinicia tamanho/imagem/quantidade ao navegar entre produtos.
  return <ProductDetail key={product.slug} product={product} />;
}
