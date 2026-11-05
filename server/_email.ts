// E-mail transacional via Resend (fetch puro). Sem RESEND_API_KEY: só registra no log e segue.
// Idempotência: chave SET NX no Redis por pedido + tipo, e Idempotency-Key no Resend.
import { dbReady, env, redis, type StoredOrder } from "./_lib";

const resendKey = () => (process.env.RESEND_API_KEY ?? "").trim();
const sender = () => (process.env.LOJA_EMAIL_REMETENTE ?? "").trim() || `Breck Imports <${env.storeEmail}>`;
export const emailKey = (ref: string, kind: EmailKind) => `brk:email:${kind}:${ref}`;
export type EmailKind = "confirmado" | "enviado";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function layout(title: string, intro: string, order: StoredOrder, extra = "") {
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} · Tam. ${esc(i.size)} × ${i.quantity}</td><td align="right">${brl(i.unitPrice * i.quantity)}</td></tr>`)
    .join("");
  const c = order.customer;
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0b0b;font-family:Arial,sans-serif;color:#f5f5f5">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141414;border-radius:12px;overflow:hidden">
<tr><td style="background:#ffd400;color:#0b0b0b;padding:16px 24px;font-weight:bold;font-size:18px">BRECK IMPORTS</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:22px;color:#ffd400">${esc(title)}</h1>
<p style="margin:0 0 16px;line-height:1.5">${intro}</p>
<p style="margin:0 0 16px">Pedido <strong>${esc(order.reference)}</strong></p>${extra}
<table width="100%" style="border-top:1px solid #333;border-bottom:1px solid #333;margin:8px 0;color:#f5f5f5">${rows}
<tr><td style="padding:6px 0">Frete (${esc(order.shipping.name)})</td><td align="right">${order.shipping.price ? brl(order.shipping.price) : "a combinar"}</td></tr>
<tr><td style="padding:6px 0"><strong>Total</strong></td><td align="right"><strong>${brl(order.total)}</strong></td></tr></table>
<p style="margin:16px 0 0;color:#bbb;font-size:13px;line-height:1.5">Entrega: ${esc(c.street)}, ${esc(c.number)}${c.complement ? " " + esc(c.complement) : ""} · ${esc(c.district)} · ${esc(c.city)}/${esc(c.state)} · CEP ${esc(c.cep)}</p>
<p style="margin:16px 0 0;color:#bbb;font-size:13px">Dúvidas? Responda este e-mail ou fale com a gente pelo WhatsApp: ${esc(env.siteUrl)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function renderEmail(kind: EmailKind, order: StoredOrder, tracking?: string | null) {
  const first = esc(order.customer.name.split(" ")[0]);
  if (kind === "confirmado")
    return {
      subject: `Pedido ${order.reference} confirmado`,
      html: layout("Pagamento aprovado!", `Oi, ${first}! Recebemos seu pagamento e já estamos separando seu pedido. Avisamos por aqui quando ele for enviado.`, order),
    };
  const link = tracking ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(tracking)}` : "";
  return {
    subject: `Seu pedido ${order.reference} foi enviado`,
    html: layout(
      "Seu pedido foi enviado",
      `Oi, ${first}! Seu pedido saiu para entrega.`,
      order,
      tracking
        ? `<p style="margin:0 0 16px">Código de rastreio: <strong style="color:#ffd400">${esc(tracking)}</strong><br><a href="${link}" style="color:#ffd400">Acompanhar entrega</a></p>`
        : "",
    ),
  };
}

/** Envia no máximo uma vez por pedido+tipo. Nunca lança: e-mail não pode derrubar o webhook. */
export async function sendOrderEmail(kind: EmailKind, order: StoredOrder, tracking?: string | null): Promise<"sent" | "skipped" | "duplicate" | "failed"> {
  const key = emailKey(order.reference, kind);
  try {
    if (dbReady()) {
      const got = await redis<string | null>("SET", key, new Date().toISOString(), "NX", "EX", 60 * 60 * 24 * 180);
      if (got !== "OK") return "duplicate";
    }
    const { subject, html } = renderEmail(kind, order, tracking);
    if (!resendKey()) {
      console.log("E-mail não enviado (RESEND_API_KEY ausente)", kind, order.reference);
      return "skipped";
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey()}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({ from: sender(), to: [order.customer.email], reply_to: env.storeEmail, subject, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
    console.log("E-mail enviado", kind, order.reference);
    return "sent";
  } catch (err) {
    console.error("Falha ao enviar e-mail", kind, order.reference, err);
    // Libera a chave para a próxima notificação tentar de novo
    if (dbReady()) await redis("DEL", key).catch(() => {});
    return "failed";
  }
}
