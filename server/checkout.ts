// POST /api/checkout { items, customer, shippingId } → cria o pagamento no Mercado Pago, grava o pedido e devolve o link
import {
  dbReady,
  env,
  json,
  MANUAL_SHIPPING,
  mercadoPago,
  ORDER_TTL,
  orderForLog,
  orderKey,
  packageFor,
  priceItems,
  quoteShipping,
  redis,
  validateCustomer,
  type CartInput,
  type Customer,
  type StoredOrder,
} from "./_lib";

/** A API de Orders recebe valores como texto com 2 casas: "299.00" */
export const money = (n: number) => n.toFixed(2);

/** Janela em que um reenvio do mesmo pedido (duplo clique, retry, F5) reaproveita a mesma order */
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;
const idemKey = (hash: string) => `brk:checkout-idem:${hash}`;

interface CachedCheckout {
  url: string;
  id: string;
  reference: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash estável do conteúdo do pedido. Mesmo carrinho + mesmo cliente + mesmo frete na mesma janela
 * gera a mesma chave, então o Mercado Pago (X-Idempotency-Key) e o nosso cache não criam duas orders.
 */
export function fingerprint(
  lines: ReturnType<typeof priceItems>,
  customer: Customer,
  ship: { id: number; price: number },
  windowStart: number,
): string {
  const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const items = lines
    .map((l) => [l.product.slug, String(l.size), l.quantity, money(l.product.price)] as const)
    .sort((a, b) => (a.join("|") < b.join("|") ? -1 : a.join("|") > b.join("|") ? 1 : 0));
  const who = (["name", "email", "phone", "cpf", "cep", "street", "number", "complement", "district", "city", "state"] as const).map((k) =>
    k === "cpf" || k === "cep" || k === "phone"
      ? String((customer as unknown as Record<string, unknown>)[k] ?? "").replace(/\D/g, "")
      : norm((customer as unknown as Record<string, unknown>)[k]),
  );
  return JSON.stringify({ v: 1, items, who, ship: [ship.id, money(ship.price)], w: windowStart });
}

export async function POST(req: Request) {
  try {
    const { items, customer, shippingId } = (await req.json()) as {
      items: CartInput[];
      customer: Customer;
      shippingId: number;
    };
    if (!env.mpToken) return json({ error: "Pagamento ainda não configurado" }, 503);
    const lines = priceItems(items ?? []);
    if (!lines.length) return json({ error: "Carrinho vazio" }, 400);
    const invalid = validateCustomer(customer);
    if (invalid) return json({ error: invalid }, 400);

    // O frete é recalculado aqui, pra ninguém mudar o valor pelo navegador
    const quotes = await quoteShipping(customer.cep, lines);
    const ship = quotes.find((q) => q.id === shippingId && (q.price > 0 || q.id === MANUAL_SHIPPING.id));
    if (!ship) return json({ error: "Escolha uma opção de frete válida" }, 400);

    // Checkout Pro via API de Orders: o frete entra como item, porque a order não tem campo de envio
    const orderItems = [
      ...lines.map((l) => ({
        title: `${l.product.name} - Tam. ${l.size}`,
        unit_price: money(l.product.price),
        quantity: l.quantity,
      })),
      ...(ship.price > 0 ? [{ title: `Frete ${ship.name}`, unit_price: money(ship.price), quantity: 1 }] : []),
    ];
    const total = orderItems.reduce((n, i) => n + Number(i.unit_price) * i.quantity, 0);
    const windowStart = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS) * IDEMPOTENCY_WINDOW_MS;
    const hash = await sha256Hex(fingerprint(lines, customer, ship, windowStart));
    // A referência também deriva do hash: o reenvio manda exatamente o mesmo corpo com a mesma chave.
    const reference = `BRK-${windowStart.toString(36).toUpperCase()}-${hash.slice(0, 6).toUpperCase()}`;

    if (dbReady()) {
      try {
        const cached = await redis<string | null>("GET", idemKey(hash));
        if (cached) {
          const hit = JSON.parse(cached) as CachedCheckout;
          console.log("Checkout repetido, reaproveitando order", hit.reference, hit.id);
          return json(hit);
        }
      } catch (err) {
        // Sem cache, a X-Idempotency-Key derivada ainda protege contra order duplicada no Mercado Pago.
        console.error("Falha ao ler idempotência no Redis", reference, err);
      }
    }

    const order = await mercadoPago("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": hash },
      body: JSON.stringify({
        type: "online",
        processing_mode: "manual",
        total_amount: money(total),
        external_reference: reference,
        description: `Pedido Breck Imports ${reference}`,
        payer: { email: customer.email },
        items: orderItems,
        config: {
          online: {
            success_url: `${env.siteUrl}/pedido/sucesso`,
            pending_url: `${env.siteUrl}/pedido/pendente`,
            failure_url: `${env.siteUrl}/pedido/erro`,
            auto_return: "approved",
          },
        },
      }),
    });

    const pairs = lines.reduce((n, l) => n + l.quantity, 0);
    const stored: StoredOrder = {
      reference,
      mpOrderId: String(order.id),
      createdAt: new Date().toISOString(),
      customer,
      items: lines.map((l) => ({ slug: l.product.slug, name: l.product.name, size: l.size, quantity: l.quantity, unitPrice: l.product.price })),
      shipping: ship,
      package: ship.id === MANUAL_SHIPPING.id ? null : packageFor(pairs),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.product.price, 0),
      total,
    };
    // A order do Mercado Pago não guarda o endereço: ele fica no Redis para a etiqueta automática.
    // Se o banco falhar, a venda segue e os dados ficam no log da Vercel para o envio manual.
    let saved = false;
    if (dbReady()) {
      try {
        await redis("SET", orderKey(reference), JSON.stringify(stored), "EX", ORDER_TTL);
        saved = true;
      } catch (err) {
        console.error("Falha ao gravar pedido no Redis", reference, err);
      }
    } else console.warn("Banco de pedidos não configurado (KV_REST_API_URL/TOKEN)");
    if (!saved) console.log("Pedido sem banco", reference, JSON.stringify(orderForLog(stored)));
    else console.log("Pedido criado", reference, order.id);

    const result: CachedCheckout = { url: String(order.checkout_url), id: String(order.id), reference };
    if (dbReady()) {
      try {
        await redis("SET", idemKey(hash), JSON.stringify(result), "PX", IDEMPOTENCY_WINDOW_MS * 2);
      } catch (err) {
        console.error("Falha ao gravar idempotência no Redis", reference, err);
      }
    }
    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível iniciar o pagamento" }, 500);
  }
}
