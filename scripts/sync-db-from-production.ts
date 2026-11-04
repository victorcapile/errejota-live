/**
 * Sincroniza o banco LOCAL (PGlite em data/pglite) a partir do banco de
 * PRODUÇÃO (Postgres/Supabase), que é a fonte da verdade.
 *
 * Uso:
 *   PRODUCTION_DATABASE_URL="postgresql://..." npm run db:sync
 *
 * Ou, se a URL de produção já estiver em DATABASE_URL/POSTGRES_URL:
 *   npm run db:sync
 *
 * Importante:
 * - Pare o `npm run dev` antes de rodar: o PGlite só aceita um processo por vez.
 * - O script faz um espelho: apaga as tabelas locais e recarrega tudo da
 *   produção. Alterações feitas apenas no banco local serão perdidas.
 */

import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

loadEnvConfig(process.cwd());

const localPath =
  process.env.LOCAL_DATABASE_PATH ?? path.join(process.cwd(), "data", "pglite");

const productionUrl =
  process.env.PRODUCTION_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!productionUrl) {
  console.error(
    [
      "URL de produção ausente.",
      "",
      "Rode com a connection string do Supabase (Vercel → Settings → Environment Variables):",
      '  PRODUCTION_DATABASE_URL="postgresql://..." npm run db:sync',
      "",
      "Ou copie para .env.local como DATABASE_URL/POSTGRES_URL.",
    ].join("\n"),
  );
  process.exit(1);
}

if (/localhost|127\.0\.0\.1/.test(productionUrl)) {
  console.error("A URL de produção aponta para localhost. Abortando.");
  process.exit(1);
}

const maskedUrl = productionUrl.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@");

/* eslint-disable @typescript-eslint/no-explicit-any */
type TableEntry = { name: string; sqlName: string; table: any };

// Ordem de dependência: pais antes dos filhos.
const TABLES: TableEntry[] = [
  { name: "regions", sqlName: "regions", table: schema.regions },
  { name: "neighborhoods", sqlName: "neighborhoods", table: schema.neighborhoods },
  { name: "tags", sqlName: "tags", table: schema.tags },
  { name: "sources", sqlName: "sources", table: schema.sources },
  { name: "source_tags", sqlName: "source_tags", table: schema.sourceTags },
  {
    name: "source_status_checks",
    sqlName: "source_status_checks",
    table: schema.sourceStatusChecks,
  },
  { name: "news_items", sqlName: "news_items", table: schema.newsItems },
  { name: "cameras", sqlName: "cameras", table: schema.cameras },
];

async function main() {
  console.log(`Origem (produção): ${maskedUrl}`);
  console.log(`Destino (local):   ${localPath}`);

  const prodClient = postgres(productionUrl!, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
  });
  const prodDb = drizzlePostgres(prodClient, { schema });

  const pglite = new PGlite(localPath);
  const localDb = drizzlePglite(pglite, { schema });

  try {
    // 1. Lê tudo da produção.
    const dump = new Map<string, any[]>();
    for (const entry of TABLES) {
      const rows = await prodDb.select().from(entry.table);
      dump.set(entry.name, rows);
      console.log(`  lido ${entry.name}: ${rows.length} linhas`);
    }

    // 2. Limpa o banco local (mantém o schema).
    console.log("\nLimpando tabelas locais...");
    await localDb.execute(
      sql.raw(
        `truncate table ${TABLES.map((entry) => `"${entry.sqlName}"`).join(", ")} cascade`,
      ),
    );

    // 3. Recarrega na ordem de dependência.
    console.log("Gravando no banco local...");
    for (const entry of TABLES) {
      const rows = dump.get(entry.name) ?? [];
      if (rows.length === 0) {
        console.log(`  ${entry.name}: 0 linhas`);
        continue;
      }

      const chunkSize = 250;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await localDb.insert(entry.table).values(rows.slice(i, i + chunkSize));
      }
      console.log(`  ${entry.name}: ${rows.length} linhas`);
    }

    console.log("\nSincronização concluída.");
  } finally {
    await prodClient.end({ timeout: 5 });
    await pglite.close();
  }
}

main().catch((error) => {
  console.error("\nFalha na sincronização:", error);
  if (String(error).includes("already open") || String(error).includes("lock")) {
    console.error(
      'O banco local parece estar em uso. Pare o "npm run dev" e tente novamente.',
    );
  }
  process.exit(1);
});
