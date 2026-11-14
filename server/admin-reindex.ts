// POST /api/admin-reindex → backfill do índice brk:pedidos: SCAN brk:pedido:* e ZADD pela data do pedido. Idempotente.
// Não altera pedido nenhum: só escreve no índice.
import { adminJson, guard, preflight } from "./_admin";
import { ORDERS_INDEX, redis } from "./_lib";

const MAX_ROUNDS = 500; // 500 x COUNT 200 cobre ~100 mil chaves; se complete=false, chamar de novo

function createdMs(raw: string | null): number {
  try {
    return Date.parse((JSON.parse(raw ?? "null") as { createdAt?: string } | null)?.createdAt ?? "");
  } catch {
    return NaN;
  }
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    let cursor = "0", scanned = 0, indexed = 0, invalid = 0, rounds = 0;
    do {
      const [next, keys] = await redis<[string, string[]]>("SCAN", cursor, "MATCH", "brk:pedido:*", "COUNT", 200);
      cursor = String(next);
      scanned += keys.length;
      if (keys.length) {
        const raws = await redis<(string | null)[]>("MGET", ...keys);
        const args: (string | number)[] = [];
        raws.forEach((raw, i) => {
          const ref = keys[i].slice("brk:pedido:".length);
          const ms = createdMs(raw);
          if (Number.isFinite(ms) && ref) args.push(ms, ref);
          else invalid++;
        });
        if (args.length) {
          await redis("ZADD", ORDERS_INDEX, ...args);
          indexed += args.length / 2;
        }
      }
    } while (cursor !== "0" && ++rounds < MAX_ROUNDS);
    return adminJson(req, { scanned, indexed, invalid, complete: cursor === "0", generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Admin reindex", err);
    return adminJson(req, { error: "falha ao reindexar" }, 502);
  }
}

export const OPTIONS = preflight;
