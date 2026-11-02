import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Garante que a coluna `cameras.is_online` exista no Postgres de produção.
 *
 * O schema local é criado pelas migrations do Drizzle, mas o banco do Supabase
 * pode estar em uma versão anterior. O `ALTER TABLE ... IF NOT EXISTS` é
 * idempotente e roda uma vez por processo, antes das consultas que usam a coluna.
 */
let schemaReady: Promise<void> | null = null;

export function ensureCameraSchema(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return Promise.resolve();
  }

  schemaReady ??= (async () => {
    try {
      await db.execute(
        sql`alter table "cameras" add column if not exists "is_online" boolean`,
      );
    } catch (error) {
      // Sem permissão de DDL ou banco indisponível: as consultas vão falhar e
      // o erro real aparece nos logs da rota.
      console.error("Falha ao garantir a coluna cameras.is_online:", error);
    }
  })();

  return schemaReady;
}
