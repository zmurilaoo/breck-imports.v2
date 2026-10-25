import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Banner, BannerMascot } from "../../types";
import { Mascot } from "../Mascot";

/** Marca o banner como "ao vivo" quando entra na tela, disparando as animações de entrada. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function BannerMascotLayer({ mascot }: { mascot: BannerMascot }) {
  return (
    <Mascot
      crop={mascot.crop}
      className={`banner-mascot fx-${mascot.fx}`}
      style={{ left: `${mascot.x}%`, top: `${mascot.y}%`, width: `${mascot.w}%` }}
    />
  );
}

/** Coleção de chuteiras: arte original recortada nas chuteiras, título e botão novos por cima. */
function ChuteirasLayout() {
  return (
    <>
      <span className="chut-cover" aria-hidden="true" />
      <span className="chut-light" aria-hidden="true" />
      <span className="chut-title" aria-hidden="true">
        <small>COLEÇÃO DE</small>
        <span>
          CHUTEI<em>RAS</em>
        </span>
      </span>
      <span className="chut-cta" aria-hidden="true">
        <span className="chut-btn">
          VER TODAS
          <svg viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M2 10h22M18 3l7 7-7 7" />
          </svg>
        </span>
        <small>ou veja abaixo alguns modelos</small>
      </span>
      <Mascot className="banner-mascot chut-mascot" />
      <span className="chut-ball" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="#fff" stroke="#111" strokeWidth="2" />
          <path d="M18 9l7 5-3 8h-8l-3-8z" fill="#111" />
        </svg>
      </span>
    </>
  );
}

/** 2 pares TN: painel novo à esquerda, no lugar do mascote da arte original. */
function TnLayout() {
  return (
    <>
      <span className="tn-panel" aria-hidden="true" />
      <span className="tn-stripe" aria-hidden="true" />
      <span className="tn-name" aria-hidden="true">
        <small>AIR MAX</small>
        TN
      </span>
      <Mascot className="banner-mascot tn-mascot" />
    </>
  );
}

/** Banner da home com o personagem da Breck animado por cima da arte. */
export function BrandBanner({ banner, className = "" }: { banner: Banner; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  return (
    <Link to={banner.to} className={`brand-banner ${className}`} aria-label={banner.alt}>
      <span
        ref={ref}
        className={`brand-banner-stage${banner.layout ? ` layout-${banner.layout}` : ""}${inView ? " is-live" : ""}`}
      >
        <img src={banner.image} alt={banner.alt} loading="lazy" />
        {banner.layout === "chuteiras" && <ChuteirasLayout />}
        {banner.layout === "tn" && <TnLayout />}
        {banner.mascots?.map((m) => <BannerMascotLayer key={`${m.fx}-${m.x}`} mascot={m} />)}
        {banner.lights?.map((light, i) => (
          <span
            key={i}
            className="banner-light"
            style={
              {
                left: `${light.x}%`,
                top: `${light.y}%`,
                width: `${light.size}%`,
                animationDelay: `${i * 0.35}s`,
              } as CSSProperties
            }
            aria-hidden="true"
          />
        ))}
        {banner.streak && <span className="banner-streak" aria-hidden="true" />}
      </span>
    </Link>
  );
}
