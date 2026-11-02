CREATE TABLE "cameras" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"page_url" text NOT NULL,
	"provider_name" text NOT NULL,
	"source_id" text,
	"neighborhood_id" text,
	"neighborhood_slug" text,
	"region_slug" text,
	"is_online" boolean,
	"imported_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "cameras_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region_id" text NOT NULL,
	"city" text DEFAULT 'Rio de Janeiro' NOT NULL,
	"state" text DEFAULT 'RJ' NOT NULL,
	"latitude" real,
	"longitude" real,
	"location_precision" text DEFAULT 'unknown' NOT NULL,
	"summary" text,
	"created_at" text NOT NULL,
	CONSTRAINT "neighborhoods_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"neighborhood_id" text,
	"kind" text DEFAULT 'headline' NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"feed_id" text,
	"published_at" text,
	"fetched_at" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "news_items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "source_status_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"checked_at" text NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"error_code" text,
	"latency_ms" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "source_tags" (
	"source_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "source_tags_source_id_tag_id_pk" PRIMARY KEY("source_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text NOT NULL,
	"search_text" text NOT NULL,
	"category" text NOT NULL,
	"provider_name" text NOT NULL,
	"provider_kind" text NOT NULL,
	"source_page_url" text NOT NULL,
	"embed_url" text,
	"media_type" text DEFAULT 'external_page' NOT NULL,
	"permission_status" text NOT NULL,
	"availability_status" text NOT NULL,
	"status_note" text,
	"scope" text NOT NULL,
	"city" text,
	"state" text,
	"region_id" text NOT NULL,
	"neighborhood_id" text,
	"latitude" real,
	"longitude" real,
	"location_precision" text DEFAULT 'unknown' NOT NULL,
	"address_hint" text,
	"license_notes" text NOT NULL,
	"terms_url" text,
	"attribution" text NOT NULL,
	"last_checked_at" text,
	"last_status_change_at" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"provenance_dataset" text,
	"provenance_record_id" text,
	"imported_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_status_checks" ADD CONSTRAINT "source_status_checks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_neighborhood_id_neighborhoods_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cameras_neighborhood_idx" ON "cameras" USING btree ("neighborhood_slug");--> statement-breakpoint
CREATE INDEX "cameras_region_idx" ON "cameras" USING btree ("region_slug");--> statement-breakpoint
CREATE INDEX "neighborhoods_region_idx" ON "neighborhoods" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "neighborhoods_name_idx" ON "neighborhoods" USING btree ("name");--> statement-breakpoint
CREATE INDEX "news_items_region_idx" ON "news_items" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "news_items_published_idx" ON "news_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_items_kind_idx" ON "news_items" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "source_status_checks_source_idx" ON "source_status_checks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_status_checks_checked_idx" ON "source_status_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "source_tags_tag_idx" ON "source_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "sources_region_idx" ON "sources" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "sources_neighborhood_idx" ON "sources" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "sources_category_idx" ON "sources" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sources_permission_idx" ON "sources" USING btree ("permission_status");--> statement-breakpoint
CREATE INDEX "sources_availability_idx" ON "sources" USING btree ("availability_status");--> statement-breakpoint
CREATE INDEX "sources_scope_idx" ON "sources" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "sources_featured_idx" ON "sources" USING btree ("is_featured");