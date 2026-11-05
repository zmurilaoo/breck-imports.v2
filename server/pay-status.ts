// GET /api/pay-status?id=123 → status atual do pagamento lido do Mercado Pago (polling da tela de Pix/boleto).
// Devolve só o status: nenhum dado pessoal do pagador.
import { env, json, mercadoPago } from "./_lib";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^\d{1,20}$/.test(id)) return json({ error: "id inválido" }, 400);
  if (!env.mpToken) return json({ error: "Pagamento ainda não configurado" }, 503);
  try {
    const p = await mercadoPago(`/v1/payments/${id}`);
    return json({ status: String(p.status ?? ""), statusDetail: String(p.status_detail ?? "") });
  } catch (e) {
    console.error(e);
    return json({ error: "Não foi possível consultar agora" }, 502);
  }
}
