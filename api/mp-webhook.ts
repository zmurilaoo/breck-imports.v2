// Mercado Pago avisa aqui quando um pagamento muda. Se foi aprovado, o envio já vai pro carrinho da SuperFrete.
import { env, json, mercadoPago, packageFor, priceItems, superfrete, type CartInput, type Customer } from "./_lib";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (type !== "payment" || !id) return json({ ok: true });

  try {
    // Busca o pagamento direto no Mercado Pago: não confiamos no corpo da notificação
    const payment = await mercadoPago(`/v1/payments/${id}`);
    if (payment.status !== "approved") return json({ ok: true, status: payment.status });

    const meta = payment.metadata as { customer: Customer; shipping_service: number; items: CartInput[] };
    const lines = priceItems(meta.items);
    const pairs = lines.reduce((n, l) => n + l.quantity, 0);
    const c = meta.customer;

    const order = await superfrete("/api/v0/cart", {
      from: { postal_code: env.originCep },
      to: {
        name: c.name,
        address: c.street,
        number: c.number,
        complement: c.complement ?? "",
        district: c.district,
        city: c.city,
        state_abbr: c.state,
        postal_code: c.cep.replace(/\D/g, ""),
        email: c.email,
        document: c.cpf.replace(/\D/g, ""),
      },
      service: meta.shipping_service,
      products: lines.map((l) => ({ name: `${l.product.name} Tam. ${l.size}`, quantity: l.quantity, unitary_value: l.product.price })),
      volumes: packageFor(pairs),
      options: { non_commercial: true, insurance_value: payment.transaction_amount, own_hand: false, receipt: false },
      tag: `MP-${id}`,
      platform: "Breck Imports",
    });
    console.log("Envio criado na SuperFrete", order?.id, "pagamento", id);
    return json({ ok: true, shipment: order?.id });
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
