/**
 * Cria as tabelas das camadas de segurança e do estado persistente
 * (modo crítico).
 *
 * Uso:
 *   npm run db:migrate-safety
 *
 * Idempotente. Em produção, use o workflow manual com DATABASE_URL.
 */
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";

async function main() {
  await db.execute(sql`
    create table if not exists "safety_facilities" (
      "id" text primary key not null,
      "kind" text not null,
      "external_id" text not null,
      "name" text not null,
      "address" text,
      "neighborhood_slug" text,
      "region_slug" text,
      "latitude" real not null,
      "longitude" real not null,
      "source_label" text not null,
      "source_url" text,
      "attribution" text not null,
      "source_updated_at" text,
      "synced_at" text not null,
      "metadata" text,
      "is_active" boolean default true not null
    )
  `);
  await db.execute(sql`
    create unique index if not exists "safety_facilities_kind_external_idx"
    on "safety_facilities" ("kind", "external_id")
  `);
  await db.execute(sql`
    create index if not exists "safety_facilities_kind_idx"
    on "safety_facilities" ("kind")
  `);
  await db.execute(sql`
    create index if not exists "safety_facilities_neighborhood_idx"
    on "safety_facilities" ("neighborhood_slug")
  `);
  await db.execute(sql`
    create index if not exists "safety_facilities_latlon_idx"
    on "safety_facilities" ("latitude", "longitude")
  `);
  await db.execute(sql`
    create table if not exists "system_state" (
      "key" text primary key not null,
      "value" text not null,
      "updated_at" text not null
    )
  `);

  console.log("Tabelas de segurança e estado garantidas.");
}

void main().finally(async () => {
  await closeDb();
});
