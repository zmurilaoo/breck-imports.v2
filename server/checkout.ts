// POST /api/checkout { items, customer, shippingId } → cria o pagamento no Mercado Pago, grava o pedido e devolve o link
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

/** A API de Orders recebe valores como texto com 2 casas: "299.00" */
const money = (n: number) => n.toFixed(2);

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
    for (const k of ["name", "email", "phone", "cpf", "cep", "street", "number", "district", "city", "state"] as const)
      if (!String(customer?.[k] ?? "").trim()) return json({ error: `Preencha o campo ${k}` }, 400);
    if (customer.cpf.replace(/\D/g, "").length !== 11) return json({ error: "CPF inválido" }, 400);

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
    const reference = `BRK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

    const order = await mercadoPago("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
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
    if (!saved) console.log("Pedido sem banco", reference, JSON.stringify(stored));
    else console.log("Pedido criado", reference, order.id);

    return json({ url: order.checkout_url, id: order.id, reference });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível iniciar o pagamento" }, 500);
  }
}
