// GET /api/estoque → { soldOut: { slug: ["40"] | ["*"] } } — público, cache curto. O site esconde/risca o que esgotou.
import { readSoldOut } from "./_stock";

export async function GET() {
  const soldOut = await readSoldOut().catch(() => ({}));
  return new Response(JSON.stringify({ soldOut }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
