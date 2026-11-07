/**
 * Remove tabelas legadas que não são mais usadas pelo app:
 * - visitor_locations / visitor_labels / usage_events (estatísticas antigas)
 * - presence_sessions (métrica de "online" removida)
 *
 * Uso:
 *   npm run db:drop-legacy
 *
 * ATENÇÃO: operação destrutiva e irreversível. Rode apenas quando tiver
 * certeza de que não precisa mais desses dados. Em produção, use o workflow
 * manual com o secret DATABASE_URL.
 */
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";

const TABLES = [
  "visitor_locations",
  "visitor_labels",
  "usage_events",
  "presence_sessions",
] as const;

async function main() {
  for (const table of TABLES) {
    await db.execute(sql.raw(`drop table if exists "${table}" cascade`));
    console.log(`Removida: ${table}`);
  }
  console.log("Tabelas legadas removidas.");
}

void main().finally(async () => {
  await closeDb();
});
