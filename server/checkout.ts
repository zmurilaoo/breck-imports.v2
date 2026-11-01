// POST /api/checkout { items, customer, shippingId } → cria o pagamento no Mercado Pago e devolve o link
import { env, json, MANUAL_SHIPPING, mercadoPago, packageFor, priceItems, SF_SERVICES, superfrete, type CartInput, type Customer } from "./_lib";

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

    // O frete é recalculado aqui, pra ninguém mudar o valor pelo navegador
    const pairs = lines.reduce((n, l) => n + l.quantity, 0);
    const value = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);
    const sfReady = Boolean(env.sfToken && env.originCep);
    const quotes = sfReady
      ? ((await superfrete("/api/v0/calculator", {
          from: { postal_code: env.originCep },
          to: { postal_code: customer.cep.replace(/\D/g, "") },
          services: SF_SERVICES,
          options: { own_hand: false, receipt: false, insurance_value: value, use_insurance_value: false },
          package: packageFor(pairs),
        })) as { id: number; name: string; price: number }[])
      : [MANUAL_SHIPPING];
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
    const reference = `BRK-${Date.now().toString(36).toUpperCase()}`;

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
    // Os dados de entrega ficam no log da Vercel com a referência, até termos um banco de pedidos
    console.log("Pedido criado", reference, order.id, JSON.stringify({ customer, shipping: ship, items }));
    return json({ url: order.checkout_url, id: order.id, reference });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível iniciar o pagamento" }, 500);
  }
}
