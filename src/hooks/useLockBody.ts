import { useEffect } from "react";

/** Trava o scroll da página e fecha com Esc enquanto um modal/drawer estiver aberto. */
export function useLockBody(active: boolean, onEscape?: () => void) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, onEscape]);
}
