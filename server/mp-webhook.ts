// Mercado Pago avisa aqui quando uma order (Checkout Pro) ou um payment (Payment Brick) muda. Eventos no painel: "Order (Mercado Pago)" e "Pagamentos".
// A notificação só serve de gatilho: o estado real vem de GET /v1/orders/{id}.
// Order paga → cria o envio na SuperFrete uma única vez por pedido (trava SET NX no Redis).
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  dbReady,
  env,
  json,
  lockKey,
  mercadoPago,
  ORDER_TTL,
  orderKey,
  redis,
  shipmentKey,
  shippingReady,
  superfrete,
  type StoredOrder,
  type StoredShipment,
} from "./_lib";
import { sendOrderEmail } from "./_email";

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

const LOCK_TTL = 120; // segundos: tempo máximo de uma tentativa de criar o envio

const missingSender = () =>
  (["name", "address", "district", "city", "state_abbr"] as const).filter((k) => !env.sender[k]);

/** Corpo do POST /api/v0/cart da SuperFrete a partir do pedido gravado */
function cartBody(o: StoredOrder) {
  const c = o.customer;
  const s = env.sender;
  return {
    from: {
      name: s.name,
      address: s.address,
      ...(s.number && { number: s.number }),
      ...(s.complement && { complement: s.complement }),
      district: s.district,
      city: s.city,
      state_abbr: s.state_abbr,
      postal_code: env.originCep,
      ...(s.document && { document: s.document }),
    },
    to: {
      name: c.name,
      address: c.street,
      number: c.number,
      ...(c.complement && { complement: c.complement }),
      district: c.district,
      city: c.city,
      state_abbr: c.state.toUpperCase(),
      postal_code: c.cep.replace(/\D/g, ""),
      document: c.cpf.replace(/\D/g, ""),
      email: c.email,
      ...(c.phone.replace(/\D/g, "").length === 11 && { phone: c.phone.replace(/\D/g, "") }),
    },
    service: o.shipping.id,
    products: o.items.map((i) => ({ name: `${i.name} - Tam. ${i.size}`, quantity: String(i.quantity), unitary_value: i.unitPrice.toFixed(2) })),
    volumes: o.package,
    options: {
      insurance_value: o.subtotal,
      receipt: false,
      own_hand: false,
      non_commercial: env.sfNonCommercial,
      tags: [{ tag: o.reference, url: env.siteUrl }],
    },
    platform: "Breck Imports",
  };
}

type ShipResult = { shipment?: StoredShipment; skipped?: string };

/** Cria (uma vez) e, se permitido, paga a etiqueta. Lança erro quando vale o Mercado Pago tentar de novo. */
async function ensureShipment(reference: string): Promise<ShipResult> {
  if (!dbReady()) return { skipped: "banco de pedidos não configurado" };
  if (!shippingReady()) return { skipped: "SuperFrete não configurada" };

  const raw = await redis<string | null>("GET", orderKey(reference));
  if (!raw) return { skipped: "pedido não encontrado no banco" };
  const order = JSON.parse(raw) as StoredOrder;
  if (!order.package || order.shipping.id === 0) return { skipped: "frete a combinar" };
  const missing = missingSender();
  if (missing.length) return { skipped: `remetente incompleto: ${missing.join(", ")}` };

  let shipment = JSON.parse((await redis<string | null>("GET", shipmentKey(reference))) ?? "null") as StoredShipment | null;

  if (!shipment) {
    // Trava: só uma execução cria o envio. Quem não pega a trava devolve 500 e o MP tenta de novo depois.
    const got = await redis<string | null>("SET", lockKey(reference), "1", "NX", "EX", LOCK_TTL);
    if (got !== "OK") throw new Error(`Envio de ${reference} já está sendo criado por outra execução`);
    try {
      // Confere de novo dentro da trava (outra execução pode ter terminado entre o GET e o SET NX)
      const again = await redis<string | null>("GET", shipmentKey(reference));
      if (again) shipment = JSON.parse(again) as StoredShipment;
      else {
        const cart = (await superfrete("/api/v0/cart", cartBody(order))) as { id: string; price: number; status: string };
        if (!cart?.id) throw new Error(`SuperFrete não devolveu id do envio: ${JSON.stringify(cart)}`);
        shipment = { sfOrderId: cart.id, price: Number(cart.price), status: cart.status ?? "pending", createdAt: new Date().toISOString() };
        // Grava o envio antes de soltar a trava: é isso que impede a etiqueta duplicada
        await redis("SET", shipmentKey(reference), JSON.stringify(shipment), "EX", ORDER_TTL);
        console.log("Envio criado na SuperFrete", reference, cart.id, cart.price);
      }
    } finally {
      await redis("DEL", lockKey(reference)).catch(() => {});
    }
  }

  if (shipment && shipment.status === "pending" && env.sfAutoPay) {
    if (shipment.price > env.sfAutoPayMax) {
      if (!shipment.note) {
        shipment.note = `Etiqueta de R$ ${shipment.price} acima do limite automático (R$ ${env.sfAutoPayMax}): pagar no painel`;
        await redis("SET", shipmentKey(reference), JSON.stringify(shipment), "EX", ORDER_TTL);
        console.warn(reference, shipment.note);
      }
    } else {
      const payLock = await redis<string | null>("SET", `${lockKey(reference)}:pagar`, "1", "NX", "EX", LOCK_TTL);
      if (payLock !== "OK") throw new Error(`Pagamento da etiqueta de ${reference} em andamento`);
      try {
        const res = (await superfrete("/api/v0/checkout", { orders: [shipment.sfOrderId] })) as {
          success?: boolean;
          purchase?: { status?: string; orders?: { id: string; tracking?: string }[] };
        };
        if (!res?.success) throw new Error(`SuperFrete não confirmou o pagamento: ${JSON.stringify(res)}`);
        const paid = res.purchase?.orders?.find((o) => o.id === shipment!.sfOrderId);
        shipment = { ...shipment, status: "released", tracking: paid?.tracking ?? null, paidAt: new Date().toISOString() };
        await redis("SET", shipmentKey(reference), JSON.stringify(shipment), "EX", ORDER_TTL);
        console.log("Etiqueta paga", reference, shipment.sfOrderId, shipment.tracking);
      } finally {
        await redis("DEL", `${lockKey(reference)}:pagar`).catch(() => {});
      }
    }
  }
  return { shipment: shipment ?? undefined };
}

/** Pagamento confirmado: etiqueta (idempotente) + e-mails (idempotentes). Lança se valer o MP tentar de novo. */
async function afterPaid(reference: string) {
  const result = await ensureShipment(reference);
  if (result.skipped) console.warn("Envio não criado automaticamente", reference, "-", result.skipped);
  let emails: Record<string, string> = {};
  if (dbReady()) {
    const raw = await redis<string | null>("GET", orderKey(reference));
    if (raw) {
      const order = JSON.parse(raw) as StoredOrder;
      emails.confirmado = await sendOrderEmail("confirmado", order);
      if (result.shipment?.tracking) emails.enviado = await sendOrderEmail("enviado", order, result.shipment.tracking);
    } else emails = { confirmado: "pedido não encontrado" };
  }
  return { shipment: result.shipment?.sfOrderId ?? null, skipped: result.skipped ?? null, emails };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; action?: string; data?: { id?: string } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = url.searchParams.get("data.id") ?? body.data?.id ?? url.searchParams.get("id");
  if ((type !== "order" && type !== "payment") || !id) return json({ ok: true });
  if (!validSignature(req, String(id))) return json({ error: "assinatura inválida" }, 401);

  try {
    let paid: boolean, reference: string;
    if (type === "payment") {
      // Pagamento transparente (Payment Brick → /v1/payments): o estado real vem de GET /v1/payments/{id}
      if (!/^\d{1,20}$/.test(String(id))) return json({ ok: true });
      const p = await mercadoPago(`/v1/payments/${id}`);
      paid = p.status === "approved";
      reference = String(p.external_reference ?? "");
      console.log("Payment", p.id, reference, p.status, p.status_detail, paid ? "PAGO" : "");
    } else {
      const order = await mercadoPago(`/v1/orders/${encodeURIComponent(String(id))}`);
      paid = order.status === "processed" && order.status_detail === "accredited";
      reference = String(order.external_reference ?? "");
      console.log("Order", order.id, reference, order.status, order.status_detail, paid ? "PAGO" : "");
    }
    if (!paid || !reference) return json({ ok: true, paid });
    return json({ ok: true, paid, ...(await afterPaid(reference)) });
  } catch (e) {
    console.error(e);
    // 500 faz o Mercado Pago tentar de novo mais tarde; as travas no Redis impedem envio e e-mail duplicados
    return json({ error: "falha ao processar" }, 500);
  }
}

// O Mercado Pago às vezes testa a URL com GET
export function GET() {
  return json({ ok: true });
}
