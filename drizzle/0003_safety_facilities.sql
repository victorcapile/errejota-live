CREATE TABLE IF NOT EXISTS "safety_facilities" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"neighborhood_slug" text,
	"region_slug" text,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"source_label" text NOT NULL,
	"source_url" text,
	"attribution" text NOT NULL,
	"source_updated_at" text,
	"synced_at" text NOT NULL,
	"metadata" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "safety_facilities_kind_external_idx" ON "safety_facilities" USING btree ("kind","external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "safety_facilities_kind_idx" ON "safety_facilities" USING btree ("kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "safety_facilities_neighborhood_idx" ON "safety_facilities" USING btree ("neighborhood_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "safety_facilities_latlon_idx" ON "safety_facilities" USING btree ("latitude","longitude");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL
);
