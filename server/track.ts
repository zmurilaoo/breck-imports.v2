// POST /api/track → contador de visita. Sempre 204: nem erro nem limite mudam a resposta (o navegador não espera nada).
import { dbReady } from "./_lib";
import { isBot, MAX_BODY, parseEvent, recordEvent } from "./_visits";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  try {
    if (!dbReady()) return noContent();
    // Do Not Track / Global Privacy Control: não conta nada
    if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return noContent();
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return noContent();
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return noContent();
    const text = await req.text();
    if (text.length > MAX_BODY) return noContent();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return noContent();
    }
    const ev = parseEvent(body);
    if (!ev) return noContent();
    const ip = (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "sem-ip";
    await recordEvent(ev, ip, ua);
  } catch (err) {
    console.error("Track: falha ao gravar", String(err).slice(0, 120));
  }
  return noContent();
}
