import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";

/**
 * Migração idempotente das tabelas de uso/localização.
 * Pode rodar no GitHub Actions com o secret DATABASE_URL.
 */
async function main() {
  await db.execute(sql`
    create table if not exists "usage_events" (
      "id" text primary key,
      "type" text not null,
      "device" text,
      "session_id" text,
      "ip" text,
      "ip_hash" text,
      "neighborhood_slug" text,
      "camera_id" text,
      "camera_name" text,
      "path" text,
      "created_at" text not null
    )
  `);
  await db.execute(sql`
    create index if not exists "usage_events_type_created_idx"
    on "usage_events" ("type", "created_at")
  `);
  await db.execute(sql`
    create index if not exists "usage_events_neighborhood_idx"
    on "usage_events" ("neighborhood_slug")
  `);
  await db.execute(sql`
    create index if not exists "usage_events_camera_idx"
    on "usage_events" ("camera_id")
  `);
  await db.execute(sql`
    create index if not exists "usage_events_ip_hash_idx"
    on "usage_events" ("ip_hash")
  `);

  await db.execute(sql`
    create table if not exists "visitor_labels" (
      "visitor_key" text primary key,
      "nickname" text not null,
      "created_at" text not null,
      "updated_at" text not null
    )
  `);

  await db.execute(sql`
    create table if not exists "visitor_locations" (
      "id" text primary key,
      "session_id" text,
      "device" text,
      "ip" text,
      "ip_hash" text,
      "latitude" double precision not null,
      "longitude" double precision not null,
      "accuracy" real,
      "street" text,
      "neighborhood" text,
      "place_key" text,
      "created_at" text not null
    )
  `);
  await db.execute(sql`
    create index if not exists "visitor_locations_ip_hash_created_idx"
    on "visitor_locations" ("ip_hash", "created_at")
  `);
  await db.execute(sql`
    create index if not exists "visitor_locations_created_idx"
    on "visitor_locations" ("created_at")
  `);
  await db.execute(sql`
    create index if not exists "visitor_locations_place_key_idx"
    on "visitor_locations" ("place_key")
  `);

  // Garante as colunas caso alguma tabela já exista em uma versão anterior.
  await db.execute(sql`alter table "usage_events" add column if not exists "device" text`);
  await db.execute(sql`alter table "visitor_locations" add column if not exists "device" text`);
  await db.execute(sql`alter table "visitor_locations" add column if not exists "street" text`);
  await db.execute(sql`alter table "visitor_locations" add column if not exists "neighborhood" text`);
  await db.execute(sql`alter table "visitor_locations" add column if not exists "place_key" text`);

  await closeDb();
  console.log("Tabelas de uso/localização garantidas.");
}

void main();
