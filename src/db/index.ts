import postgres, { type Sql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema> & { $client: Sql };

const globalForDb = globalThis as typeof globalThis & {
  __sauronDb?: Database;
};

function createDatabase(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL precisa apontar para o Postgres do Supabase.");
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
  });

  return drizzle(client, { schema });
}

export const db = globalForDb.__sauronDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sauronDb = db;
}
