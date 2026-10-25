import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "../Icons";

interface Props {
  children: ReactNode;
  /** Classe que define a largura dos slides (ver index.css). */
  variant?: "products" | "categories" | "services" | "testimonials" | "hero";
  label: string;
  autoplay?: number;
  dots?: boolean;
}

/** Carrossel leve baseado em scroll-snap: funciona com toque, trackpad, teclado e setas. */
export function Carousel({ children, variant = "products", label, autoplay, dots }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [paused, setPaused] = useState(false);
  const slides = Children.toArray(children);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
    const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
    setPages(total);
    setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (total - 1)));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, slides.length]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  const goTo = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: pages <= 1 ? 0 : (max * index) / (pages - 1), behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoplay || paused || pages <= 1) return;
    const id = window.setInterval(() => scrollByPage(1), autoplay);
    return () => window.clearInterval(id);
  }, [autoplay, paused, pages, scrollByPage]);

  return (
    <div
      className={`carousel carousel-${variant}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="carousel-track" ref={trackRef} tabIndex={0}>
        {slides.map((child, i) => (
          <div className="carousel-slide" key={i}>
            {child}
          </div>
        ))}
      </div>
      {(canPrev || canNext) && (
        <>
          <button
            type="button"
            className="carousel-arrow carousel-prev"
            aria-label="Anterior"
            disabled={!canPrev}
            onClick={() => scrollByPage(-1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="carousel-arrow carousel-next"
            aria-label="Próximo"
            disabled={!canNext && !autoplay}
            onClick={() => scrollByPage(1)}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
      {dots && pages > 1 && (
        <div className="carousel-dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para página ${i + 1}`}
              aria-current={i === page}
              className={i === page ? "is-active" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
