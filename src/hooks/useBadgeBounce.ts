import { useEffect, useRef } from "react";

/** "Pulinho" no contador do carrinho (.cart-badge) quando a quantidade sobe. Respeita movimento reduzido. */
export function useBadgeBounce(count: number) {
  const prev = useRef(count);
  useEffect(() => {
    const grew = count > prev.current;
    prev.current = count;
    if (!grew || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll<HTMLElement>(".cart-badge").forEach((el) =>
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.6) translateY(-3px)" },
          { transform: "scale(0.9)" },
          { transform: "scale(1)" },
        ],
        { duration: 520, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
      ),
    );
  }, [count]);
}
