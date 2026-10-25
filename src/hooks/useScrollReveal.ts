import { useEffect } from "react";

/** Elementos que entram com animação ao aparecer na tela. */
const SELECTOR = [
  ".section-title",
  ".section-banner",
  ".product-card",
  ".home-category",
  ".service-item",
  ".faq-item",
  ".testimonial",
  ".promo-products-banner",
  ".grid-banner .brand-banner",
  ".instafeed-inner",
  ".product-gallery",
  ".product-info",
  ".listing-header",
  ".info-content",
  ".account-card",
  ".footer-brand",
  ".footer-col",
].join(",");

const DURATION = 700;

/**
 * Aplica a animação de "revelar ao rolar" em toda a página, inclusive em
 * elementos que entram depois (troca de rota, filtros, carrosséis).
 */
export function useScrollReveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Elementos aguardando entrar na tela (o StrictMode monta o efeito duas vezes, por isso é local)
    const pending = new Set<HTMLElement>();
    const seen = new WeakSet<Element>();

    const show = (el: HTMLElement) => {
      pending.delete(el);
      el.classList.add("is-visible");
      // Depois da entrada, devolve o elemento às transições normais (hover etc.)
      const delay = parseInt(el.style.getPropertyValue("--reveal-delay")) || 0;
      window.setTimeout(() => {
        el.classList.remove("reveal", "is-visible");
        el.style.removeProperty("--reveal-delay");
      }, DURATION + delay);
    };

    // Revela o que entrou na tela ou já ficou para trás (rolagem rápida, âncoras)
    const check = () => {
      const limit = window.innerHeight * 0.92;
      for (const el of pending) {
        const r = el.getBoundingClientRect();
        if (r.top < limit && r.left < window.innerWidth && r.right > 0) show(el);
      }
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Já passou da tela (ex.: voltar no histórico): não esconde
        if (el.getBoundingClientRect().bottom < 0) return;
        // Escalona irmãos (cards de um carrossel/grade) para entrarem em cascata
        const item = el.parentElement?.classList.contains("carousel-slide") ? el.parentElement : el;
        const index = item.parentElement ? Array.prototype.indexOf.call(item.parentElement.children, item) : 0;
        el.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 80}ms`);
        el.classList.add("reveal");
        pending.add(el);
      });
      check();
    };

    let frame = 0;
    const schedule = (fn: () => void) => () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          fn();
        });
    };
    const onScroll = schedule(check);
    const mo = new MutationObserver(schedule(scan));

    scan();
    mo.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });
    // Captura também a rolagem horizontal dos carrosséis
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);

    return () => {
      mo.disconnect();
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
}
