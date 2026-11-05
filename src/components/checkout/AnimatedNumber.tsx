import { useEffect, useRef, useState } from "react";
import { formatPrice } from "../../utils/format";

const DURATION = 450;

/** Valor em reais que "corre" até o novo número (placar). Leitor de tela recebe só o valor final. */
export function AnimatedPrice({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = start + (value - start) * eased;
      from.current = current;
      setShown(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatPrice(shown)}</span>
      <span className="sr-only">{formatPrice(value)}</span>
    </span>
  );
}
