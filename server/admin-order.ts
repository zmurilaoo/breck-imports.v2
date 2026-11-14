// GET /api/admin-order?ref=BRK-... → detalhe do pedido com dado pessoal mascarado e status atual do Mercado Pago
import { adminJson, detail, guard, livePayment, loadOne, preflight, REF_RE } from "./_admin";

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  if (!REF_RE.test(ref)) return adminJson(req, { error: "ref inválida" }, 400);
  try {
    const loaded = await loadOne(ref);
    if (!loaded) return adminJson(req, { error: "pedido não encontrado" }, 404);
    loaded.order.payment = await livePayment(loaded.order);
    return adminJson(req, { order: detail(loaded) });
  } catch (err) {
    console.error("Admin order", ref, err);
    return adminJson(req, { error: "falha ao ler pedido" }, 502);
  }
}

export const OPTIONS = preflight;
