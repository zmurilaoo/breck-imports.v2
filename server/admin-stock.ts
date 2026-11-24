// GET  /api/admin-stock → { soldOut } (painel)
// POST /api/admin-stock { slug, size ("*" = produto inteiro), soldOut: boolean } → marca/desmarca esgotado.
// Só com o token do painel (guard). Valida slug e tamanho contra o catálogo: não cria nada.
import { adminJson, guard, preflight } from "./_admin";
import { readSoldOut, setSoldOut } from "./_stock";

export const OPTIONS = preflight;

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    return adminJson(req, { soldOut: await readSoldOut() });
  } catch {
    return adminJson(req, { error: "Não foi possível ler o estoque agora" }, 503);
  }
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { slug?: unknown; size?: unknown; soldOut?: unknown } | null;
  const slug = typeof b?.slug === "string" ? b.slug.trim() : "";
  const size = typeof b?.size === "string" ? b.size.trim() : "";
  if (!/^[a-z0-9-]{3,120}$/.test(slug) || !/^(\*|[0-9]{2}(\.5)?|[A-Z]{1,3})$/.test(size) || typeof b?.soldOut !== "boolean")
    return adminJson(req, { error: "Envie slug, size (ex.: 41 ou *) e soldOut (true/false)" }, 400);
  try {
    const soldOut = await setSoldOut(slug, size, b.soldOut);
    return adminJson(req, { ok: true, soldOut: soldOut[slug] ?? [] });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 503;
    return adminJson(req, { error: status === 503 ? "Não foi possível gravar o estoque agora" : (e as Error).message }, status);
  }
}
