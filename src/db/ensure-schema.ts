import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Ajustes idempotentes de schema/dados que precisam existir antes das consultas.
 *
 * - Cria `cameras.is_online` se o banco de produção estiver em uma versão anterior.
 * - Corrige a região da Freguesia (Jacarepaguá) para Zona Sudoeste, que é a
 *   região usada pelo GeoJSON e pelas câmeras importadas.
 *
 * Roda uma vez por processo.
 */
let schemaReady: Promise<void> | null = null;

export function ensureCameraSchema(): Promise<void> {
  schemaReady ??= (async () => {
    try {
      await db.execute(
        sql`alter table "cameras" add column if not exists "is_online" boolean`,
      );
      await db.execute(sql`
        update "neighborhoods"
        set "region_id" = 'region_zona-sudoeste'
        where "slug" = 'freguesia-jacarepagua'
          and "region_id" <> 'region_zona-sudoeste'
      `);
      await db.execute(sql`
        update "cameras"
        set "region_slug" = 'zona-sudoeste'
        where "neighborhood_slug" = 'freguesia-jacarepagua'
          and "region_slug" <> 'zona-sudoeste'
      `);
    } catch (error) {
      // Sem permissão de DDL ou banco indisponível: as consultas vão falhar e
      // o erro real aparece nos logs da rota.
      console.error("Falha ao aplicar ajustes de schema/dados:", error);
    }
  })();

  return schemaReady;
}
