// POST /api/frete { cep, items } → opções de entrega da SuperFrete (PAC e SEDEX)
import { json, priceItems, quoteShipping, type CartInput } from "./_lib";

export async function POST(req: Request) {
  try {
    const { cep, items } = (await req.json()) as { cep: string; items: CartInput[] };
    const to = String(cep ?? "").replace(/\D/g, "");
    if (to.length !== 8) return json({ error: "CEP inválido" }, 400);
    const options = await quoteShipping(to, priceItems(items ?? []));
    if (!options.length) return json({ error: "Nenhuma opção de entrega para esse CEP" }, 422);
    return json({ options });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível calcular o frete agora" }, 500);
  }
}
