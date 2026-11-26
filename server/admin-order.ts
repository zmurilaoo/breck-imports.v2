// GET  /api/admin-order?ref=BRK-... → detalhe do pedido com dado pessoal mascarado e status atual do Mercado Pago
// POST /api/admin-order { ref, acao } → envio na SuperFrete de um pedido PAGO (dash, com confirmação do dono):
//   acao "criar_envio"     cria o envio no carrinho da SuperFrete (não cobra nada; idempotente)
//   acao "pagar_etiqueta"  cria se faltar e paga a etiqueta com o saldo da SuperFrete, até `limite` reais (teto 300)
import { adminJson, detail, guard, livePayment, loadOne, normPaymentStatus, preflight, REF_RE } from "./_admin";
import { ensureShipment } from "./mp-webhook";

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

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { ref?: unknown; acao?: unknown; limite?: unknown };
  const ref = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";
  const acao = body.acao;
  if (!REF_RE.test(ref)) return adminJson(req, { error: "ref inválida" }, 400);
  if (acao !== "criar_envio" && acao !== "pagar_etiqueta") return adminJson(req, { error: "acao inválida" }, 400);
  const limite = typeof body.limite === "number" && Number.isFinite(body.limite) ? body.limite : undefined;
  if (acao === "pagar_etiqueta" && (limite === undefined || limite <= 0 || limite > 300)) return adminJson(req, { error: "limite obrigatório (até R$ 300)" }, 400);
  try {
    const loaded = await loadOne(ref);
    if (!loaded) return adminJson(req, { error: "pedido não encontrado" }, 404);
    // Só pedido pago (estado confirmado no Mercado Pago agora) ganha envio.
    const payment = await livePayment(loaded.order);
    if (normPaymentStatus(payment) !== "approved") return adminJson(req, { error: "pedido ainda não está pago" }, 409);
    const r = await ensureShipment(ref, acao === "pagar_etiqueta" ? { payNow: true, payMax: limite } : {});
    const after = await loadOne(ref);
    console.log("Admin envio", ref, acao, r.skipped ?? "ok");
    return adminJson(req, { ok: !r.skipped || Boolean(r.shipment), skipped: r.skipped ?? null, order: after ? detail({ ...after, order: { ...after.order, payment } }) : null });
  } catch (err) {
    console.error("Admin envio", ref, acao, err);
    const msg = String((err as Error)?.message ?? "");
    // A SuperFrete explica o motivo (saldo, endereço, CEP): repassa sem dado sensível.
    const sf = /^SuperFrete \d+:/.test(msg) ? msg.slice(0, 300).replace(/\d{11,14}/g, "***") : null;
    return adminJson(req, { error: sf ? `A SuperFrete recusou: ${sf}` : "falha ao criar o envio" }, 502);
  }
}

export const OPTIONS = preflight;
