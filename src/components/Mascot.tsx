import type { CSSProperties } from "react";

/**
 * Personagem da Breck recortado da logo, sem o letreiro "BRECK IMPORTS".
 * "head" mostra só cabeça e ombros, para ele espiar pela borda.
 */
export function Mascot({
  crop,
  className = "",
  style,
}: {
  crop?: "head";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`mascot${crop === "head" ? " mascot-head" : ""} ${className}`} style={style} aria-hidden="true">
      <img src="/images/logo-breck.png" alt="" loading="lazy" />
    </span>
  );
}
