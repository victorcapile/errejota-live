import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __appDb?: Database;
};

export const localDatabasePath =
  process.env.LOCAL_DATABASE_PATH ??
  path.join(process.cwd(), "data", "pglite");

function createPostgresDatabase(connectionString: string): Database {
  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
  });

  return drizzlePostgres(client, { schema });
}

/**
 * Banco local de desenvolvimento (PGlite) usado quando `DATABASE_URL` e
 * `POSTGRES_URL` não estão configuradas. O PGlite roda PostgreSQL em WASM no
 * próprio processo do Next.js e dispensa um servidor externo.
 *
 * Crie o banco com `npm run db:local`. Como o PGlite usa o sistema de arquivos,
 * apenas um processo pode abrir o diretório por vez: pare o servidor de
 * desenvolvimento ao rodar scripts que gravam no banco local.
 */
function createLocalDatabase(): Database {
  const marker = path.join(localDatabasePath, "PG_VERSION");
  if (!fs.existsSync(marker)) {
    throw new Error(
      `Banco local não encontrado em ${localDatabasePath}. Rode "npm run db:local" para criar e popular o banco de desenvolvimento.`,
    );
  }

  const client = new PGlite(localDatabasePath);

  // Fecha o PGlite de forma limpa ao parar o processo; isso permite que o
  // PostgreSQL em WASM grave o WAL antes de encerrar. Um encerramento abrupto
  // durante uma escrita pode deixar o diretório inconsistente.
  const closeOnExit = () => {
    void client.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", closeOnExit);
  process.once("SIGTERM", closeOnExit);

  // Os dois drivers expõem a mesma API de consulta do Drizzle. O cast mantém o
  // tipo do banco de produção para o restante da aplicação.
  return drizzlePglite(client, { schema }) as unknown as Database;
}

function createDatabase(): Database {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (connectionString) {
    return createPostgresDatabase(connectionString);
  }

  // O `next build` roda vários workers em paralelo. O PGlite só aceita um
  // processo por diretório, então um build local precisa de um Postgres real.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    throw new Error(
      "O build de produção precisa de DATABASE_URL/POSTGRES_URL. O banco local (PGlite) é apenas para desenvolvimento.",
    );
  }

  return createLocalDatabase();
}

export const db = globalForDb.__appDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__appDb = db;
}
