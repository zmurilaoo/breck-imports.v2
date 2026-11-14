// Contador de visitas leve: um POST /api/track por evento via sendBeacon. Sem cookie, sem identificador,
// sem dado pessoal. Respeita Do Not Track e Global Privacy Control. Falha é silenciosa: nunca atrapalha a compra.
export type TrackType = "page_view" | "product_view" | "add_to_cart" | "checkout_start" | "checkout_step" | "purchase";

interface TrackPayload {
  type: TrackType;
  path?: string;
  slug?: string;
  step?: string;
  ref?: string;
}

const SOURCE_KEY = "brk-src-sent";

function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const w = window as Window & { doNotTrack?: string };
  return n.doNotTrack === "1" || w.doNotTrack === "1" || n.msDoNotTrack === "1" || n.globalPrivacyControl === true;
}

/** Origem da sessão (utm_source ou host do referrer externo), enviada só no primeiro page_view da aba */
function sessionSource(): string | undefined {
  try {
    if (sessionStorage.getItem(SOURCE_KEY)) return undefined;
    sessionStorage.setItem(SOURCE_KEY, "1");
  } catch {
    return undefined; // sem storage não dá para saber se é o primeiro: não manda origem
  }
  const utm = new URLSearchParams(location.search).get("utm_source");
  if (utm) return utm.slice(0, 40);
  try {
    const host = document.referrer ? new URL(document.referrer).host : "";
    return host && host !== location.host ? host : "";
  } catch {
    return "";
  }
}

export function track(type: TrackType, extra: Omit<TrackPayload, "type" | "path"> = {}): void {
  try {
    if (import.meta.env.DEV || optedOut()) return;
    const body: TrackPayload = { type, path: location.pathname, ...extra };
    if (type === "page_view") {
      const ref = sessionSource();
      if (ref !== undefined) body.ref = ref;
    }
    const data = JSON.stringify(body);
    if (navigator.sendBeacon?.("/api/track", data)) return;
    void fetch("/api/track", { method: "POST", body: data, keepalive: true }).catch(() => {});
  } catch {
    /* contador nunca quebra a loja */
  }
}

/** Dispara uma vez por chave na aba (ex.: compra aprovada não conta de novo se a página recarregar) */
export function trackOnce(key: string, type: TrackType, extra: Omit<TrackPayload, "type" | "path"> = {}): void {
  try {
    const k = `brk-once-${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    /* sem storage: conta mesmo assim */
  }
  track(type, extra);
}
