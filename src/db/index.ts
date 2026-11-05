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

// Referências aos clientes para permitir fechamento explícito em scripts.
let localClient: PGlite | null = null;
let remoteClient: ReturnType<typeof postgres> | null = null;

type RemoteBundle = {
  db: Database;
  client: ReturnType<typeof postgres>;
  createdAt: number;
};

// Em serverless o processo fica congelado entre requisições e o pooler pode
// derrubar a conexão ociosa. Renovar o cliente periodicamente evita reutilizar
// um socket morto (que travaria a query para sempre).
const REMOTE_TTL_MS = 5_000;
let remoteBundle: RemoteBundle | null = null;
let remoteConn: string | null = null;

function createRemoteBundle(connectionString: string): RemoteBundle {
  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    max_lifetime: 60,
    connect_timeout: 10,
    connection: { application_name: "errejota-live" },
  });
  remoteClient = client;

  return {
    db: drizzlePostgres(client, { schema }),
    client,
    createdAt: Date.now(),
  };
}

function getRemoteDb(connectionString: string): Database {
  const now = Date.now();
  if (
    !remoteBundle ||
    remoteConn !== connectionString ||
    now - remoteBundle.createdAt > REMOTE_TTL_MS
  ) {
    const previous = remoteBundle?.client;
    remoteBundle = createRemoteBundle(connectionString);
    remoteConn = connectionString;
    if (previous) {
      void previous.end({ timeout: 2 }).catch(() => {});
    }
  }

  return remoteBundle.db;
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
    if (process.env.NODE_ENV === "production") {
      // Proxy para que cada acesso use o cliente mais recente. Necessário no
      // runtime serverless, onde a instância é reaproveitada entre requisições.
      return new Proxy({} as Database, {
        get(_target, property, receiver) {
          const instance = getRemoteDb(connectionString);
          const value = Reflect.get(instance, property, receiver);
          return typeof value === "function" ? value.bind(instance) : value;
        },
      });
    }
    return createRemoteBundle(connectionString).db;
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

/**
 * Fecha as conexões abertas. Use em scripts (CLI) para liberar o PGlite antes
 * de o processo terminar; no servidor Next.js isso não é necessário.
 */
export async function closeDb(): Promise<void> {
  const local = localClient;
  localClient = null;
  if (local) {
    try {
      await local.close();
    } catch {
      // Ignora falhas de fechamento em encerramento.
    }
  }

  remoteBundle = null;
  remoteConn = null;
  const remote = remoteClient;
  remoteClient = null;
  if (remote) {
    try {
      await remote.end({ timeout: 5 });
    } catch {
      // Ignora falhas de fechamento em encerramento.
    }
  }
}
