// GET /api/admin-visits?from=ISO&to=ISO → visitas por dia, funil, páginas/produtos mais vistos e origem (só leitura)
import { adminJson, guard, parsePeriod, preflight } from "./_admin";
import { readVisits } from "./_visits";

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const period = parsePeriod(new URL(req.url));
  if (typeof period === "string") return adminJson(req, { error: period }, 400);
  try {
    return adminJson(req, { ...(await readVisits(period.fromMs, period.toMs)), generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Admin visits", String(err).slice(0, 120));
    return adminJson(req, { error: "falha ao ler visitas" }, 502);
  }
}

export const OPTIONS = preflight;
