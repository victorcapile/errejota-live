import { sql, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { presenceSessions } from "@/db/schema";

/** Considera online quem enviou batimento nos últimos 60 segundos. */
const ONLINE_WINDOW_MS = 60_000;
/** Remove sessões inativas há mais de 24 horas. */
const RETENTION_MS = 24 * 60 * 60 * 1000;
/** Valida o formato do identificador enviado pelo cliente. */
const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

let schemaReady: Promise<void> | null = null;

/**
 * Garante a tabela de presença em bancos que ainda não passaram por migração.
 * Idempotente e barato; roda uma vez por processo.
 */
function ensurePresenceTable(): Promise<void> {
  schemaReady ??= db
    .execute(
      sql`create table if not exists "presence_sessions" (
        "session_id" text primary key,
        "last_seen" bigint not null
      )`,
    )
    .then(() => undefined)
    .catch((error) => {
      // Permite nova tentativa na próxima requisição.
      schemaReady = null;
      throw error;
    });

  return schemaReady;
}

async function countOnline(): Promise<number> {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(presenceSessions)
    .where(gt(presenceSessions.lastSeen, cutoff));

  return Number(row?.count ?? 0);
}

export async function GET() {
  try {
    await ensurePresenceTable();
    const online = await countOnline();
    return Response.json(
      { online },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao contar usuários online:", error);
    return Response.json(
      { error: "Não foi possível consultar usuários online." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: unknown;
  };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return Response.json({ error: "sessionId inválido." }, { status: 400 });
  }

  try {
    await ensurePresenceTable();

    const now = Date.now();
    await db
      .insert(presenceSessions)
      .values({ sessionId, lastSeen: now })
      .onConflictDoUpdate({
        target: presenceSessions.sessionId,
        set: { lastSeen: now },
      });

    // Limpeza oportunista: mantém a tabela pequena sem job agendado.
    if (Math.random() < 0.1) {
      await db
        .delete(presenceSessions)
        .where(lt(presenceSessions.lastSeen, now - RETENTION_MS));
    }

    const online = await countOnline();
    return Response.json(
      { online },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao registrar presença:", error);
    return Response.json(
      { error: "Não foi possível registrar presença." },
      { status: 500 },
    );
  }
}
