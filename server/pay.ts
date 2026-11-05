// POST /api/pay { formData, items, customer, shippingId } → pagamento transparente (Payment Brick + /v1/payments).
// O cartão chega só como token gerado pelo SDK do Mercado Pago no navegador: nenhum dado de cartão passa por aqui.
// Valor, frete e total são recalculados no servidor; o valor que o Brick mostrou só é conferido, nunca usado.
import {
  dbReady,
  env,
  json,
  MANUAL_SHIPPING,
  mercadoPago,
  ORDER_TTL,
  orderKey,
  packageFor,
  priceItems,
  quoteShipping,
  redis,
  type CartInput,
  type Customer,
  type StoredOrder,
} from "./_lib";
import { fingerprint, money, sha256Hex } from "./checkout";

const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;
const payIdemKey = (hash: string) => `brk:pay-idem:${hash}`;
const PIX_MINUTES = 30;
// Anti card testing: tentativas de cartão por IP numa janela (Upstash INCR). Falha do Redis não bloqueia a venda.
const CARD_LIMIT = 8;
const CARD_WINDOW_S = 15 * 60;
const clientIp = (req: Request) =>
  (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "sem-ip";

async function cardAttemptsExceeded(req: Request): Promise<boolean> {
  if (!dbReady()) return false;
  try {
    const key = `brk:rl:pay:${await sha256Hex(clientIp(req))}`;
    const count = await redis<number>("INCR", key);
    if (count === 1) await redis("EXPIRE", key, CARD_WINDOW_S);
    return count > CARD_LIMIT;
  } catch (err) {
    console.error("Falha no limite de tentativas", err);
    return false;
  }
}

/** Campos do formData do Brick que aceitamos (allowlist). Qualquer outro é ignorado. */
interface BrickFormData {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  installments?: number;
  transaction_amount?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

export interface PayResult {
  status: string;
  statusDetail: string;
  paymentId: string;
  reference: string;
  message?: string;
  pix?: { qrCode: string; qrCodeBase64: string; ticketUrl: string; expiresAt: string | null };
  boleto?: { url: string; barcode: string | null; expiresAt: string | null };
}

const REJECT_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
  cc_rejected_bad_filled_date: "Confira a data de validade do cartão.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança (CVV).",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_insufficient_amount: "O cartão não tem limite suficiente. Tente outro cartão ou o Pix.",
  cc_rejected_call_for_authorize: "O banco pediu autorização. Ligue para o seu banco e tente de novo, ou pague com Pix.",
  cc_rejected_card_disabled: "Esse cartão não está ativo. Ligue para o banco ou use outro cartão.",
  cc_rejected_duplicated_payment: "Você já fez um pagamento com esse valor. Se precisar pagar de novo, use outro cartão ou o Pix.",
  cc_rejected_high_risk: "O pagamento foi recusado por segurança. Tente o Pix ou outro cartão.",
  cc_rejected_max_attempts: "Você atingiu o limite de tentativas. Use outro cartão ou o Pix.",
  cc_rejected_blacklist: "Não foi possível processar com esse cartão. Tente o Pix ou outro cartão.",
  cc_rejected_invalid_installments: "Esse cartão não aceita esse número de parcelas.",
  cc_rejected_card_error: "Não conseguimos processar o cartão. Tente de novo ou use o Pix.",
  cc_rejected_other_reason: "O banco recusou o pagamento. Tente outro cartão ou o Pix.",
};
export const rejectMessage = (detail: string) =>
  REJECT_MESSAGES[detail] ?? "O pagamento não foi aprovado. Nada foi cobrado: tente outro cartão ou o Pix.";

/** Data no formato do Mercado Pago, em horário de Brasília: 2026-11-05T14:30:00.000-03:00 */
function mpDate(ms: number) {
  return new Date(ms - 3 * 3600 * 1000).toISOString().replace("Z", "-03:00");
}

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") || parts[0] || "" };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toResult(p: Record<string, any>, reference: string): PayResult {
  const status = String(p.status ?? "");
  const statusDetail = String(p.status_detail ?? "");
  const r: PayResult = { status, statusDetail, paymentId: String(p.id), reference };
  const td = p.point_of_interaction?.transaction_data;
  if (p.payment_method_id === "pix" && td)
    r.pix = {
      qrCode: String(td.qr_code ?? ""),
      qrCodeBase64: String(td.qr_code_base64 ?? ""),
      ticketUrl: String(td.ticket_url ?? ""),
      expiresAt: p.date_of_expiration ?? null,
    };
  if (p.payment_type_id === "ticket")
    r.boleto = {
      url: String(p.transaction_details?.external_resource_url ?? ""),
      barcode: p.barcode?.content ?? null,
      expiresAt: p.date_of_expiration ?? null,
    };
  if (status === "rejected") r.message = rejectMessage(statusDetail);
  return r;
}

export async function POST(req: Request) {
  try {
    const { formData, items, customer, shippingId } = (await req.json()) as {
      formData: BrickFormData;
      items: CartInput[];
      customer: Customer;
      shippingId: number;
    };
    if (!env.mpToken) return json({ error: "Pagamento ainda não configurado" }, 503);
    const lines = priceItems(items ?? []);
    if (!lines.length) return json({ error: "Carrinho vazio" }, 400);
    for (const k of ["name", "email", "phone", "cpf", "cep", "street", "number", "district", "city", "state"] as const)
      if (!String(customer?.[k] ?? "").trim()) return json({ error: `Preencha o campo ${k}` }, 400);
    const cpf = customer.cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return json({ error: "CPF inválido" }, 400);

    const method = String(formData?.payment_method_id ?? "").trim();
    if (!/^[a-z0-9_]{2,30}$/.test(method)) return json({ error: "Escolha uma forma de pagamento" }, 400);
    const isPix = method === "pix";
    const isBoleto = method === "bolbradesco" || method === "pec";
    const token = String(formData.token ?? "");
    if (!isPix && !isBoleto && !token) return json({ error: "Dados do cartão incompletos" }, 400);
    if (!isPix && !isBoleto && (await cardAttemptsExceeded(req)))
      return json({ error: "Muitas tentativas com cartão. Aguarde alguns minutos ou pague com Pix." }, 429);

    // Frete e total recalculados aqui: ninguém muda valor pelo navegador
    const quotes = await quoteShipping(customer.cep, lines);
    const ship = quotes.find((q) => q.id === shippingId && (q.price > 0 || q.id === MANUAL_SHIPPING.id));
    if (!ship) return json({ error: "Escolha uma opção de frete válida" }, 400);
    const subtotal = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);
    const total = Math.round((subtotal + ship.price) * 100) / 100;
    // As parcelas do Brick foram calculadas sobre o valor que ele recebeu: se diverge, o cliente revê antes de pagar
    const shown = Number(formData.transaction_amount);
    if (Number.isFinite(shown) && Math.abs(shown - total) > 0.01)
      return json({ error: `O total foi atualizado para R$ ${money(total).replace(".", ",")}. Confira e pague de novo.`, total }, 409);

    const windowStart = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS) * IDEMPOTENCY_WINDOW_MS;
    const orderHash = await sha256Hex(fingerprint(lines, customer, ship, windowStart));
    const reference = `BRK-${windowStart.toString(36).toUpperCase()}-${orderHash.slice(0, 6).toUpperCase()}`;
    // Token de cartão é de uso único: outro cartão = novo pagamento; reenvio do mesmo submit = mesma chave
    const hash = await sha256Hex(`pay:v1|${orderHash}|${method}|${token}|${Number(formData.installments) || 1}`);

    if (dbReady()) {
      try {
        const cached = await redis<string | null>("GET", payIdemKey(hash));
        if (cached) {
          console.log("Pagamento repetido, reaproveitando", reference);
          return json(JSON.parse(cached));
        }
      } catch (err) {
        console.error("Falha ao ler idempotência do pagamento", reference, err);
      }
    }

    const name = splitName(customer.name);
    const idFromBrick = formData.payer?.identification;
    const payer: Record<string, unknown> = {
      email: customer.email.trim(),
      ...name,
      identification:
        !isPix && !isBoleto && idFromBrick?.number
          ? { type: String(idFromBrick.type ?? "CPF"), number: String(idFromBrick.number).replace(/\D/g, "") }
          : { type: "CPF", number: cpf },
      ...(isBoleto && {
        address: {
          zip_code: customer.cep.replace(/\D/g, ""),
          street_name: customer.street,
          street_number: customer.number,
          neighborhood: customer.district,
          city: customer.city,
          federal_unit: customer.state.toUpperCase(),
        },
      }),
    };
    const body: Record<string, unknown> = {
      transaction_amount: total,
      description: `Pedido Breck Imports ${reference}`,
      external_reference: reference,
      payment_method_id: method,
      payer,
      statement_descriptor: "BRECKIMPORTS",
      additional_info: {
        items: lines.map((l) => ({ id: l.product.slug, title: `${l.product.name} - Tam. ${l.size}`, quantity: l.quantity, unit_price: l.product.price })),
        payer: { first_name: name.first_name, last_name: name.last_name, phone: { number: customer.phone.replace(/\D/g, "") } },
        shipments: { receiver_address: { zip_code: customer.cep.replace(/\D/g, ""), street_name: customer.street, street_number: customer.number } },
      },
    };
    if (isPix) body.date_of_expiration = mpDate(Date.now() + PIX_MINUTES * 60 * 1000);
    else if (isBoleto) body.date_of_expiration = mpDate(Date.now() + 3 * 24 * 3600 * 1000);
    else {
      body.token = token;
      body.installments = Math.max(1, Math.min(12, Math.floor(Number(formData.installments) || 1)));
      if (formData.issuer_id) body.issuer_id = String(formData.issuer_id);
    }

    const payment = await mercadoPago("/v1/payments", { method: "POST", headers: { "X-Idempotency-Key": hash }, body: JSON.stringify(body) });
    const result = toResult(payment, reference);
    console.log("Pagamento", reference, result.paymentId, method, result.status, result.statusDetail);

    // Pedido gravado para a etiqueta e o e-mail do webhook (recusado não vira pedido)
    if (result.status !== "rejected") {
      const pairs = lines.reduce((n, l) => n + l.quantity, 0);
      const stored: StoredOrder = {
        reference,
        mpOrderId: `payment:${result.paymentId}`,
        createdAt: new Date().toISOString(),
        customer,
        items: lines.map((l) => ({ slug: l.product.slug, name: l.product.name, size: l.size, quantity: l.quantity, unitPrice: l.product.price })),
        shipping: ship,
        package: ship.id === MANUAL_SHIPPING.id ? null : packageFor(pairs),
        subtotal,
        total,
      };
      let saved = false;
      if (dbReady()) {
        try {
          await redis("SET", orderKey(reference), JSON.stringify(stored), "EX", ORDER_TTL);
          saved = true;
        } catch (err) {
          console.error("Falha ao gravar pedido no Redis", reference, err);
        }
      }
      if (!saved) console.log("Pedido sem banco", reference, JSON.stringify(stored));
    }
    if (dbReady()) {
      try {
        await redis("SET", payIdemKey(hash), JSON.stringify(result), "PX", IDEMPOTENCY_WINDOW_MS * 2);
      } catch (err) {
        console.error("Falha ao gravar idempotência do pagamento", reference, err);
      }
    }
    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível processar o pagamento agora. Tente de novo: se ele já tiver entrado, não será cobrado duas vezes." }, 502);
  }
}
