// GET /api/admin-orders?from=ISO&to=ISO&status=paid|pending|all&limit=50&cursor= → lista paginada (só leitura)
import { adminJson, guard, loadRange, parsePeriod, preflight, summary } from "./_admin";

const STATUS: Record<string, readonly string[] | null> = { paid: ["approved"], pending: ["pending", "unknown"], all: null };

const encodeCursor = (ms: number, ref: string) => Buffer.from(`${ms}|${ref}`).toString("base64url");
function decodeCursor(c: string): { ms: number; ref: string } | null {
  const [ms, ref] = Buffer.from(c, "base64url").toString().split("|");
  return ms && Number.isFinite(Number(ms)) && ref ? { ms: Number(ms), ref } : null;
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const period = parsePeriod(url);
  if (typeof period === "string") return adminJson(req, { error: period }, 400);
  const status = url.searchParams.get("status") ?? "all";
  if (!(status in STATUS)) return adminJson(req, { error: "status inválido (paid|pending|all)" }, 400);
  const limitRaw = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 50;
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursorRaw && !cursor) return adminJson(req, { error: "cursor inválido" }, 400);

  try {
    const { items } = await loadRange(period.fromMs, period.toMs);
    const allowed = STATUS[status];
    let rows = items.map((l) => ({ l, s: summary(l) })).filter((r) => !allowed || allowed.includes(r.s.paymentStatus));
    // Mesma ordem de loadRange: createdMs desc, ref desc no empate
    if (cursor) rows = rows.filter((r) => r.l.createdMs < cursor.ms || (r.l.createdMs === cursor.ms && r.l.order.reference < cursor.ref));
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor = rows.length > limit && last ? encodeCursor(last.l.createdMs, last.l.order.reference) : null;
    return adminJson(req, { orders: page.map((r) => r.s), nextCursor, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Admin orders", err);
    return adminJson(req, { error: "falha ao ler pedidos" }, 502);
  }
}

export const OPTIONS = preflight;
