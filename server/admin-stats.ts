// GET /api/admin-stats?from=ISO&to=ISO → números do período a partir do índice (status gravado, sem chamar o MP)
import { adminJson, guard, loadRange, normMethod, normPaymentStatus, normShipment, parsePeriod, preflight } from "./_admin";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const period = parsePeriod(new URL(req.url));
  if (typeof period === "string") return adminJson(req, { error: period }, 400);
  try {
    const { items, truncated } = await loadRange(period.fromMs, period.toMs);
    let revenuePaid = 0, ordersPaid = 0, ordersPending = 0, shippingCharged = 0, shippingPaid = 0;
    const byMethod = { pix: { count: 0, total: 0 }, card: { count: 0, total: 0 }, ticket: { count: 0, total: 0 }, other: { count: 0, total: 0 } };
    const products = new Map<string, { slug: string; name: string; quantity: number; total: number }>();
    for (const { order: o, shipment } of items) {
      const st = normPaymentStatus(o.payment);
      // "unknown" = pedido do Checkout Pro ainda sem webhook: conta como pendente
      if (st === "pending" || st === "unknown") ordersPending++;
      if (st !== "approved") continue;
      const total = Number(o.total) || 0;
      ordersPaid++;
      revenuePaid += total;
      const m = byMethod[normMethod(o.payment) ?? "other"];
      m.count++;
      m.total += total;
      shippingCharged += Number(o.shipping?.price) || 0;
      const ss = normShipment(shipment);
      if (shipment && (ss === "released" || ss === "posted" || ss === "delivered")) shippingPaid += Number(shipment.price) || 0;
      for (const i of o.items ?? []) {
        const p = products.get(i.slug) ?? { slug: i.slug, name: i.name, quantity: 0, total: 0 };
        p.quantity += Number(i.quantity) || 0;
        p.total += (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0);
        products.set(i.slug, p);
      }
    }
    for (const k of Object.keys(byMethod) as (keyof typeof byMethod)[]) byMethod[k].total = r2(byMethod[k].total);
    const topProducts = [...products.values()]
      .sort((a, b) => b.quantity - a.quantity || b.total - a.total)
      .slice(0, 10)
      .map((p) => ({ ...p, total: r2(p.total) }));
    return adminJson(req, {
      revenuePaid: r2(revenuePaid),
      ordersPaid,
      ordersPending,
      avgTicket: ordersPaid ? r2(revenuePaid / ordersPaid) : 0,
      byMethod,
      shippingCharged: r2(shippingCharged),
      shippingPaid: r2(shippingPaid),
      topProducts,
      ...(truncated && { truncated: true }),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Admin stats", err);
    return adminJson(req, { error: "falha ao calcular" }, 502);
  }
}

export const OPTIONS = preflight;
