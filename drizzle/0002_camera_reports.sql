CREATE TABLE IF NOT EXISTS "camera_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"camera_id" text NOT NULL,
	"camera_external_id" text,
	"camera_name" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ip_hash" text,
	"salt_version" text,
	"dedupe_key" text,
	"moderated_by" text,
	"moderated_at" text,
	"moderation_note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "camera_reports_status_created_idx" ON "camera_reports" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "camera_reports_camera_idx" ON "camera_reports" USING btree ("camera_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "camera_reports_dedupe_idx" ON "camera_reports" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "camera_reports_ip_hash_created_idx" ON "camera_reports" USING btree ("ip_hash","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"detail" text,
	"actor" text DEFAULT 'admin' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_created_idx" ON "admin_audit" USING btree ("created_at");
