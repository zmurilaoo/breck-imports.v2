/**
 * Servidor próprio da loja (VPS Hostinger), no lugar da Vercel.
 *
 * - /api/<nome>: chama as mesmas funções de server/*.ts (padrão web: GET/POST(req: Request) → Response).
 * - Resto: arquivos de dist/ com fallback para index.html (SPA), cabeçalhos de segurança e cache.
 * - Fica atrás do Caddy. Ele termina o HTTPS e envia o IP real em X-Real-IP; o IP que o cliente
 *   manda é descartado, então não dá para falsificar.
 * - Limite de requisições por IP em memória (uma instância só).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import * as frete from "./frete.ts";
import * as checkout from "./checkout.ts";
import * as mpWebhook from "./mp-webhook.ts";
import * as pay from "./pay.ts";
import * as payStatus from "./pay-status.ts";
import * as adminOrders from "./admin-orders.ts";
import * as adminOrder from "./admin-order.ts";
import * as adminStats from "./admin-stats.ts";
import * as adminReindex from "./admin-reindex.ts";
import * as track from "./track.ts";
import * as adminVisits from "./admin-visits.ts";
import * as estoque from "./estoque.ts";

type Handler = (req: Request) => Response | Promise<Response>;
type Mod = Partial<Record<"GET" | "POST" | "PUT" | "DELETE" | "OPTIONS", Handler>>;

const ROUTES: Record<string, Mod> = {
  frete, checkout, "mp-webhook": mpWebhook, pay, "pay-status": payStatus,
  "admin-orders": adminOrders, "admin-order": adminOrder, "admin-stats": adminStats,
  "admin-reindex": adminReindex, track, "admin-visits": adminVisits, estoque,
} as unknown as Record<string, Mod>;

const PORT = Number(process.env.PORT ?? 8080);
const DIST = resolve(process.env.DIST_DIR ?? "dist");
const MAX_BODY = 1_000_000;

/* ---------- limite de requisições (janela de 1 min, por IP e grupo) ---------- */
// Pagamento e checkout mais apertados; o webhook do MP fica de fora (o MP reenvia).
const LIMITS: Record<string, number> = { pay: 12, checkout: 20, frete: 40, "pay-status": 60, track: 120, admin: 120, default: 60 };
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string, route: string): boolean {
  if (route === "mp-webhook") return false;
  const group = route.startsWith("admin-") ? "admin" : route in LIMITS ? route : "default";
  const key = `${group}|${ip}`;
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { n: 1, reset: now + 60_000 });
    return false;
  }
  e.n += 1;
  return e.n > (LIMITS[group] ?? LIMITS.default!);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}, 60_000).unref();

/* ---------- cabeçalhos de segurança ---------- */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://sdk.mercadopago.com https://http2.mlstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mercadopago.com https://api.mercadolibre.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com",
  "frame-src https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self \"https://*.mercadopago.com\")",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};
// CSP valendo por padrão; CSP_REPORT_ONLY=1 vira modo "só registra" (contingência sem novo deploy).
SECURITY_HEADERS[process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"] = CSP;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

function setSecurity(res: ServerResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (v) res.setHeader(k, v);
}

const clientIp = (req: IncomingMessage) =>
  (String(req.headers["x-real-ip"] ?? "").trim() || req.socket.remoteAddress || "sem-ip").slice(0, 64);

/* ---------- /api ---------- */
async function readBody(req: IncomingMessage): Promise<Buffer | null> {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw Object.assign(new Error("payload grande"), { status: 413 });
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

async function handleApi(route: string, req: IncomingMessage, res: ServerResponse) {
  const mod = ROUTES[route];
  const method = (req.method ?? "GET").toUpperCase() as keyof Mod;
  const fn = mod?.[method];
  res.setHeader("Cache-Control", "no-store");
  if (!mod) return send(res, 404, { error: "Rota não encontrada" });
  if (!fn) return send(res, 405, { error: "Método não permitido" });
  const ip = clientIp(req);
  if (limited(ip, route)) {
    res.setHeader("Retry-After", "60");
    return send(res, 429, { error: "Muitas tentativas. Espere um minuto e tente de novo." });
  }
  let body: Buffer | null;
  try {
    body = await readBody(req);
  } catch (e) {
    return send(res, (e as { status?: number }).status ?? 400, { error: "Requisição inválida." });
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined || k === "x-forwarded-for" || k === "x-real-ip") continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }
  headers.set("x-real-ip", ip); // único IP que as funções enxergam
  const url = `https://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
  try {
    const out = await fn(new Request(url, { method, headers, body: body && body.length ? body : undefined }));
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch (err) {
    console.error(`[api/${route}]`, (err as Error).name, (err as Error).message?.slice(0, 200));
    if (!res.headersSent) send(res, 500, { error: "Erro interno." });
    else res.end();
  }
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

/* ---------- arquivos estáticos ---------- */
function serveStatic(pathname: string, req: IncomingMessage, res: ServerResponse) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.statusCode = 400;
    return res.end();
  }
  const rel = normalize(decoded).replace(/^([/\\])+/, "");
  let file = join(DIST, rel);
  // Bloqueia saída da pasta (../), arquivos ocultos e mapas de fonte.
  if (!(file === DIST || file.startsWith(DIST + sep)) || /(^|[/\\])\./.test(rel) || file.endsWith(".map")) {
    res.statusCode = 404;
    return res.end();
  }
  let st = safeStat(file);
  let isIndex = false;
  if (!st || st.isDirectory()) {
    // Asset que não existe é 404 de verdade; rota da SPA cai no index.html.
    if (extname(rel) && !rel.endsWith(".html")) {
      res.statusCode = 404;
      return res.end();
    }
    file = join(DIST, "index.html");
    st = safeStat(file);
    isIndex = true;
  }
  if (!st) {
    res.statusCode = 500;
    return res.end();
  }
  const ext = extname(file);
  res.setHeader("Content-Type", TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Content-Length", st.size);
  if (isIndex || ext === ".html") res.setHeader("Cache-Control", "no-cache");
  else if (rel.startsWith("assets/") || rel.startsWith("fonts/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  else if (rel.startsWith("images/")) res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  else res.setHeader("Cache-Control", "public, max-age=3600");
  if (req.method === "HEAD") return res.end();
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

function safeStat(f: string) {
  try {
    return statSync(f);
  } catch {
    return null;
  }
}

/* ---------- servidor ---------- */
const server = createServer((req, res) => {
  setSecurity(res);
  res.removeHeader("X-Powered-By");
  const pathname = (req.url ?? "/").split("?")[0] ?? "/";
  if (pathname === "/healthz") return send(res, 200, { ok: true });
  const m = /^\/api\/([a-z-]+)\/?$/.exec(pathname);
  if (m) return void handleApi(m[1]!, req, res);
  if (pathname.startsWith("/api/")) return send(res, 404, { error: "Rota não encontrada" });
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    return res.end();
  }
  serveStatic(pathname, req, res);
});
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.listen(PORT, "0.0.0.0", () => console.log(`loja ouvindo em :${PORT} (dist=${DIST})`));
