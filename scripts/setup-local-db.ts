/**
 * Cria (ou atualiza) o banco local de desenvolvimento em `data/pglite`.
 *
 * Uso:
 *   npm run db:local   # schema + seeds + câmeras
 *
 * O banco local é usado quando `DATABASE_URL`/`POSTGRES_URL` não estão
 * definidas. Ele é um PostgreSQL em WASM (PGlite), então não precisa de um
 * servidor externo. Como o PGlite grava no sistema de arquivos, apenas um
 * processo pode abrir o diretório por vez: rode os scripts com o servidor de
 * desenvolvimento parado.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const databasePath =
  process.env.LOCAL_DATABASE_PATH ??
  path.join(process.cwd(), "data", "pglite");
const migrationsFolder = path.join(process.cwd(), "drizzle");

async function main() {
  if (process.env.DATABASE_URL ?? process.env.POSTGRES_URL) {
    console.log(
      "DATABASE_URL/POSTGRES_URL está definida. Use `npm run db:setup` para o banco remoto.",
    );
    return;
  }

  if (fs.existsSync(path.join(databasePath, "PG_VERSION"))) {
    console.log(`Banco local encontrado em ${databasePath}. Aplicando migrations…`);
  } else {
    console.log(`Criando banco local em ${databasePath}…`);
  }

  const client = new PGlite(databasePath);
  await client.waitReady;

  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    console.log("Schema atualizado.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Falha ao preparar o banco local:", error);
  process.exit(1);
});
