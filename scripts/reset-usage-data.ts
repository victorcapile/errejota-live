import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";

/**
 * Apaga apenas os dados de uso/admin para reiniciar a coleta:
 * eventos, apelidos e localizações. Não toca no catálogo, chuva ou risco.
 */
async function main() {
  await db.execute(sql`
    truncate table "usage_events", "visitor_labels", "visitor_locations"
  `);
  await closeDb();
  console.log("Dados de uso, apelidos e localizações apagados.");
}

void main();
