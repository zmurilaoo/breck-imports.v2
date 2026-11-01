// Mercado Pago avisa aqui quando uma order muda (evento "Order (Mercado Pago)" configurado no painel).
// A notificação só serve de gatilho: o estado real vem de GET /v1/orders/{id}.
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, json, mercadoPago } from "./_lib";

/**
 * Confere o header x-signature ("ts=...,v1=...") com a chave secreta do webhook.
 * Manifesto conforme a doc de webhooks do Mercado Pago: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 */
function validSignature(req: Request, dataId: string): boolean {
  if (!env.mpWebhookSecret) return true; // sem segredo cadastrado ainda: aceita, mas a order é sempre conferida na API
  const header = req.headers.get("x-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const requestId = req.headers.get("x-request-id") ?? "";
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", env.mpWebhookSecret).update(manifest).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string } };
  const type = body.type ?? url.searchParams.get("type");
  const id = url.searchParams.get("data.id") ?? body.data?.id;
  if (type !== "order" || !id) return json({ ok: true });
  if (!validSignature(req, id)) return json({ error: "assinatura inválida" }, 401);

  try {
    const order = await mercadoPago(`/v1/orders/${encodeURIComponent(id)}`);
    const paid = order.status === "processed" && order.status_detail === "accredited";
    console.log("Order", order.id, order.external_reference, order.status, order.status_detail, paid ? "PAGO" : "");
    // Próximo passo quando a SuperFrete e um banco de pedidos estiverem ligados: gerar o envio aqui
    return json({ ok: true, paid });
  } catch (e) {
    console.error(e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return json({ error: "falha ao processar" }, 500);
  }
}

// O Mercado Pago às vezes testa a URL com GET
export function GET() {
  return json({ ok: true });
}
