CREATE TABLE "city_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"message" text,
	"source_label" text DEFAULT 'Atualização manual' NOT NULL,
	"effective_at" text NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drainage_points" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"source_id" text NOT NULL,
	"neighborhood_slug" text,
	"region_slug" text,
	"basin" text,
	"sub_basin" text,
	"point_class" text,
	"description" text,
	"corrective_measure" text,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "drainage_points_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"status" text NOT NULL,
	"started_at" text NOT NULL,
	"finished_at" text,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "presence_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"last_seen" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rain_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"neighborhood_slug" text NOT NULL,
	"region_slug" text,
	"day" text NOT NULL,
	"max_mm_24h" real,
	"avg_mm_24h" real,
	"station_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rain_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"neighborhood_slug" text,
	"region_slug" text,
	"metric" text NOT NULL,
	"value_mm" real NOT NULL,
	"reading_at" text NOT NULL,
	"collected_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rain_stations" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"source_id" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"address" text,
	"neighborhood_id" text,
	"neighborhood_slug" text,
	"region_slug" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "rain_stations_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "risk_indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"neighborhood_slug" text NOT NULL,
	"region_slug" text,
	"source_id" text NOT NULL,
	"kind" text NOT NULL,
	"class" text DEFAULT 'nao_avaliado' NOT NULL,
	"score" real,
	"coverage" real,
	"computed_at" text NOT NULL,
	"source_version" text
);
--> statement-breakpoint
ALTER TABLE "drainage_points" ADD CONSTRAINT "drainage_points_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rain_observations" ADD CONSTRAINT "rain_observations_station_id_rain_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."rain_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rain_stations" ADD CONSTRAINT "rain_stations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rain_stations" ADD CONSTRAINT "rain_stations_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_indicators" ADD CONSTRAINT "risk_indicators_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_stages_effective_idx" ON "city_stages" USING btree ("effective_at");--> statement-breakpoint
CREATE INDEX "drainage_points_neighborhood_idx" ON "drainage_points" USING btree ("neighborhood_slug");--> statement-breakpoint
CREATE INDEX "drainage_points_latlon_idx" ON "drainage_points" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "ingest_runs_job_started_idx" ON "ingest_runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rain_daily_unique_idx" ON "rain_daily" USING btree ("neighborhood_slug","day");--> statement-breakpoint
CREATE INDEX "rain_daily_day_idx" ON "rain_daily" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "rain_observations_unique_idx" ON "rain_observations" USING btree ("station_id","metric","reading_at");--> statement-breakpoint
CREATE INDEX "rain_observations_neighborhood_metric_reading_idx" ON "rain_observations" USING btree ("neighborhood_slug","metric","reading_at");--> statement-breakpoint
CREATE INDEX "rain_observations_reading_idx" ON "rain_observations" USING btree ("reading_at");--> statement-breakpoint
CREATE INDEX "rain_stations_neighborhood_idx" ON "rain_stations" USING btree ("neighborhood_slug");--> statement-breakpoint
CREATE INDEX "rain_stations_region_idx" ON "rain_stations" USING btree ("region_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_indicators_unique_idx" ON "risk_indicators" USING btree ("neighborhood_slug","source_id","kind");--> statement-breakpoint
CREATE INDEX "risk_indicators_neighborhood_idx" ON "risk_indicators" USING btree ("neighborhood_slug");--> statement-breakpoint
CREATE INDEX "risk_indicators_kind_idx" ON "risk_indicators" USING btree ("kind");