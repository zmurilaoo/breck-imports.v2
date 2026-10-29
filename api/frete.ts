// POST /api/frete { cep, items } → opções de entrega da SuperFrete (PAC, SEDEX, Mini Envios)
import { env, json, packageFor, priceItems, SF_SERVICES, superfrete, type CartInput } from "./_lib";

interface SfQuote {
  id: number;
  name: string;
  price: number;
  delivery_time: number;
  error?: string;
  has_error?: boolean;
}

export async function POST(req: Request) {
  try {
    const { cep, items } = (await req.json()) as { cep: string; items: CartInput[] };
    const to = String(cep ?? "").replace(/\D/g, "");
    if (to.length !== 8) return json({ error: "CEP inválido" }, 400);
    if (!env.sfToken || !env.originCep) return json({ error: "Frete ainda não configurado" }, 503);

    const lines = priceItems(items ?? []);
    const pairs = lines.reduce((n, l) => n + l.quantity, 0) || 1;
    const value = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);

    const quotes = (await superfrete("/api/v0/calculator", {
      from: { postal_code: env.originCep },
      to: { postal_code: to },
      services: SF_SERVICES,
      options: { own_hand: false, receipt: false, insurance_value: value, use_insurance_value: false },
      package: packageFor(pairs),
    })) as SfQuote[];

    const options = quotes
      .filter((q) => !q.has_error && !q.error && q.price > 0)
      .map((q) => ({ id: q.id, name: q.name, price: Number(q.price), days: q.delivery_time }))
      .sort((a, b) => a.price - b.price);
    return json({ options });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível calcular o frete agora" }, 500);
  }
}
