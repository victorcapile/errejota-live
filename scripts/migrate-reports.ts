/**
 * Cria as tabelas de relatos de câmera e auditoria do admin.
 *
 * Uso:
 *   npm run db:migrate-reports
 *
 * Idempotente: pode ser executado mais de uma vez. Em produção, use o
 * workflow manual com o secret DATABASE_URL.
 */
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";

async function main() {
  await db.execute(sql`
    create table if not exists "camera_reports" (
      "id" text primary key not null,
      "camera_id" text not null,
      "camera_external_id" text,
      "camera_name" text not null,
      "reason" text not null,
      "note" text,
      "status" text default 'pending' not null,
      "ip_hash" text,
      "salt_version" text,
      "dedupe_key" text,
      "moderated_by" text,
      "moderated_at" text,
      "moderation_note" text,
      "created_at" text not null,
      "updated_at" text not null
    )
  `);
  await db.execute(sql`
    create index if not exists "camera_reports_status_created_idx"
    on "camera_reports" ("status", "created_at")
  `);
  await db.execute(sql`
    create index if not exists "camera_reports_camera_idx"
    on "camera_reports" ("camera_id")
  `);
  await db.execute(sql`
    create index if not exists "camera_reports_dedupe_idx"
    on "camera_reports" ("dedupe_key")
  `);
  await db.execute(sql`
    create index if not exists "camera_reports_ip_hash_created_idx"
    on "camera_reports" ("ip_hash", "created_at")
  `);

  await db.execute(sql`
    create table if not exists "admin_audit" (
      "id" text primary key not null,
      "action" text not null,
      "entity" text not null,
      "entity_id" text,
      "detail" text,
      "actor" text default 'admin' not null,
      "created_at" text not null
    )
  `);
  await db.execute(sql`
    create index if not exists "admin_audit_created_idx"
    on "admin_audit" ("created_at")
  `);

  console.log("Tabelas de relatos e auditoria garantidas.");
}

void main().finally(async () => {
  await closeDb();
});
