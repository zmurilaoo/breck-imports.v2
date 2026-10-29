// POST /api/checkout { items, customer, shippingId } → cria o pagamento no Mercado Pago e devolve o link
import { env, json, mercadoPago, packageFor, priceItems, SF_SERVICES, superfrete, type CartInput, type Customer } from "./_lib";

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
    const quotes = (await superfrete("/api/v0/calculator", {
      from: { postal_code: env.originCep },
      to: { postal_code: customer.cep.replace(/\D/g, "") },
      services: SF_SERVICES,
      options: { own_hand: false, receipt: false, insurance_value: value, use_insurance_value: false },
      package: packageFor(pairs),
    })) as { id: number; name: string; price: number }[];
    const ship = quotes.find((q) => q.id === shippingId && q.price > 0);
    if (!ship) return json({ error: "Escolha uma opção de frete válida" }, 400);

    const [first, ...rest] = customer.name.trim().split(/\s+/);
    const preference = await mercadoPago("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: lines.map((l) => ({
          id: l.product.slug,
          title: `${l.product.name} — Tam. ${l.size}`,
          picture_url: `${env.siteUrl}${l.product.images[0]}`,
          quantity: l.quantity,
          unit_price: l.product.price,
          currency_id: "BRL",
        })),
        shipments: { cost: Number(ship.price), mode: "not_specified" },
        payer: {
          name: first,
          surname: rest.join(" "),
          email: customer.email,
          phone: { number: customer.phone.replace(/\D/g, "") },
          identification: { type: "CPF", number: customer.cpf.replace(/\D/g, "") },
          address: { zip_code: customer.cep.replace(/\D/g, ""), street_name: customer.street, street_number: customer.number },
        },
        payment_methods: { installments: 12 },
        back_urls: {
          success: `${env.siteUrl}/pedido/sucesso`,
          pending: `${env.siteUrl}/pedido/pendente`,
          failure: `${env.siteUrl}/pedido/erro`,
        },
        auto_return: "approved",
        notification_url: `${env.siteUrl}/api/mp-webhook`,
        statement_descriptor: "BRECK IMPORTS",
        // Tudo que o webhook precisa pra gerar o envio na SuperFrete depois do pagamento
        metadata: {
          customer,
          shipping_service: ship.id,
          shipping_name: ship.name,
          items: lines.map((l) => ({ slug: l.product.slug, size: l.size, quantity: l.quantity })),
        },
      }),
    });
    return json({ url: preference.init_point, id: preference.id });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível iniciar o pagamento" }, 500);
  }
}
