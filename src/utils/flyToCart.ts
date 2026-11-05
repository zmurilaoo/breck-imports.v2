/**
 * "Voa pro carrinho": clona a foto do produto e a leva até o ícone do carrinho
 * no header, só com transform/opacity (WAAPI). Sem ícone visível ou com
 * movimento reduzido, não faz nada — o toast e o pulinho do contador bastam.
 */
export function flyToCart(source: Element | null | undefined) {
  if (!source || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll<HTMLElement>(".cart-btn")].find((el) => el.getClientRects().length > 0);
  if (!target) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || to.bottom < 0) return;

  const img = source instanceof HTMLImageElement ? source : source.querySelector("img");
  const ghost = document.createElement("div");
  ghost.className = "fly-ghost";
  ghost.setAttribute("aria-hidden", "true");
  if (img?.currentSrc || img?.src) ghost.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
  const size = Math.min(from.width, from.height, 220);
  Object.assign(ghost.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${from.left + (from.width - size) / 2}px`,
    top: `${from.top + (from.height - size) / 2}px`,
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = 24 / size;
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 0.95 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 40}px) scale(${Math.max(end, 0.45)})`, opacity: 0.9, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.2 },
    ],
    { duration: 650, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
  );
  const done = () => ghost.remove();
  anim.onfinish = done;
  anim.oncancel = done;
}
