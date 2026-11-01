import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const databasePath = path.join(process.cwd(), "data", "catalog.db");

type Database = LibSQLDatabase<typeof schema> & {
  $client: Client;
};

const globalForDb = globalThis as typeof globalThis & {
  __sauronDb?: Database;
  __sauronClient?: Client;
};

function createDatabase(): Database {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const client = createClient({
    url: `file:${databasePath}`,
  });

  globalForDb.__sauronClient = client;
  return drizzle(client, { schema });
}

export const db = globalForDb.__sauronDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sauronDb = db;
}

export { databasePath };
