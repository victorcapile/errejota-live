import {
  bigint,
  boolean,
  index,
  integer,
  primaryKey,
  pgTable,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  AVAILABILITY_STATUS_VALUES,
  CATEGORY_VALUES,
  CITY_STAGE_VALUES,
  LOCATION_PRECISION_VALUES,
  MEDIA_TYPE_VALUES,
  NEWS_KIND_VALUES,
  PERMISSION_STATUS_VALUES,
  PROVIDER_KIND_VALUES,
  RAIN_METRIC_VALUES,
  RISK_CLASS_VALUES,
  RISK_KIND_VALUES,
  SCOPE_VALUES,
} from "@/lib/constants";

export const regions = pgTable("regions", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const neighborhoods = pgTable(
  "neighborhoods",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    city: text("city").notNull().default("Rio de Janeiro"),
    state: text("state").notNull().default("RJ"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationPrecision: text("location_precision", {
      enum: [...LOCATION_PRECISION_VALUES],
    })
      .notNull()
      .default("unknown"),
    summary: text("summary"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("neighborhoods_region_idx").on(table.regionId),
    index("neighborhoods_name_idx").on(table.name),
  ],
);

export const newsItems = pgTable(
  "news_items",
  {
    id: text("id").primaryKey(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "cascade" }),
    neighborhoodId: text("neighborhood_id").references(() => neighborhoods.id, {
      onDelete: "set null",
    }),
    kind: text("kind", { enum: [...NEWS_KIND_VALUES] })
      .notNull()
      .default("headline"),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    publisher: text("publisher").notNull(),
    feedId: text("feed_id"),
    publishedAt: text("published_at"),
    fetchedAt: text("fetched_at").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("news_items_region_idx").on(table.regionId),
    index("news_items_published_idx").on(table.publishedAt),
    index("news_items_kind_idx").on(table.kind),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    searchText: text("search_text").notNull(),
    category: text("category", { enum: [...CATEGORY_VALUES] }).notNull(),
    providerName: text("provider_name").notNull(),
    providerKind: text("provider_kind", {
      enum: [...PROVIDER_KIND_VALUES],
    }).notNull(),
    sourcePageUrl: text("source_page_url").notNull(),
    embedUrl: text("embed_url"),
    mediaType: text("media_type", { enum: [...MEDIA_TYPE_VALUES] })
      .notNull()
      .default("external_page"),
    permissionStatus: text("permission_status", {
      enum: [...PERMISSION_STATUS_VALUES],
    }).notNull(),
    availabilityStatus: text("availability_status", {
      enum: [...AVAILABILITY_STATUS_VALUES],
    }).notNull(),
    statusNote: text("status_note"),
    scope: text("scope", { enum: [...SCOPE_VALUES] }).notNull(),
    city: text("city"),
    state: text("state"),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    neighborhoodId: text("neighborhood_id").references(() => neighborhoods.id, {
      onDelete: "set null",
    }),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationPrecision: text("location_precision", {
      enum: [...LOCATION_PRECISION_VALUES],
    })
      .notNull()
      .default("unknown"),
    addressHint: text("address_hint"),
    licenseNotes: text("license_notes").notNull(),
    termsUrl: text("terms_url"),
    attribution: text("attribution").notNull(),
    lastCheckedAt: text("last_checked_at"),
    lastStatusChangeAt: text("last_status_change_at"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    provenanceDataset: text("provenance_dataset"),
    provenanceRecordId: text("provenance_record_id"),
    importedAt: text("imported_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("sources_region_idx").on(table.regionId),
    index("sources_neighborhood_idx").on(table.neighborhoodId),
    index("sources_category_idx").on(table.category),
    index("sources_permission_idx").on(table.permissionStatus),
    index("sources_availability_idx").on(table.availabilityStatus),
    index("sources_scope_idx").on(table.scope),
    index("sources_featured_idx").on(table.isFeatured),
  ],
);

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
});

export const sourceTags = pgTable(
  "source_tags",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.sourceId, table.tagId] }),
    index("source_tags_tag_idx").on(table.tagId),
  ],
);

export const sourceStatusChecks = pgTable(
  "source_status_checks",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    checkedAt: text("checked_at").notNull(),
    status: text("status", { enum: [...AVAILABILITY_STATUS_VALUES] }).notNull(),
    httpStatus: integer("http_status"),
    errorCode: text("error_code"),
    latencyMs: integer("latency_ms"),
    notes: text("notes"),
  },
  (table) => [
    index("source_status_checks_source_idx").on(table.sourceId),
    index("source_status_checks_checked_idx").on(table.checkedAt),
  ],
);

export const cameras = pgTable(
  "cameras",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull().unique(),
    name: text("name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    pageUrl: text("page_url").notNull(),
    providerName: text("provider_name").notNull(),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    neighborhoodId: text("neighborhood_id").references(
      () => neighborhoods.id,
      { onDelete: "set null" },
    ),
    neighborhoodSlug: text("neighborhood_slug"),
    regionSlug: text("region_slug"),
    isOnline: boolean("is_online"),
    importedAt: text("imported_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("cameras_neighborhood_idx").on(table.neighborhoodSlug),
    index("cameras_region_idx").on(table.regionSlug),
  ],
);

export type RegionRow = typeof regions.$inferSelect;
export type CameraRow = typeof cameras.$inferSelect;
export type NeighborhoodRow = typeof neighborhoods.$inferSelect;
export type SourceRow = typeof sources.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type SourceStatusCheckRow = typeof sourceStatusChecks.$inferSelect;

/**
 * Presença efêmera: cada aba/navegador registra um "batimento" periódico.
 * A contagem de usuários online é derivada da janela de tempo (últimos
 * 60 segundos), então linhas antigas podem ser removidas sem prejuízo.
 */
export const presenceSessions = pgTable("presence_sessions", {
  sessionId: text("session_id").primaryKey(),
  lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
});

/**
 * Estações pluviométricas oficiais (Alerta Rio / Geo-Rio).
 * O ponto é associado a um bairro por join espacial na ingestão.
 */
export const rainStations = pgTable(
  "rain_stations",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull().unique(),
    name: text("name").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    address: text("address"),
    neighborhoodId: text("neighborhood_id").references(
      () => neighborhoods.id,
      { onDelete: "set null" },
    ),
    neighborhoodSlug: text("neighborhood_slug"),
    regionSlug: text("region_slug"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("rain_stations_neighborhood_idx").on(table.neighborhoodSlug),
    index("rain_stations_region_idx").on(table.regionSlug),
  ],
);

/**
 * Leituras de chuva por estação e janela de acumulação.
 * A chave única permite reprocessar o mesmo arquivo sem duplicar linhas.
 */
export const rainObservations = pgTable(
  "rain_observations",
  {
    id: text("id").primaryKey(),
    stationId: text("station_id")
      .notNull()
      .references(() => rainStations.id, { onDelete: "cascade" }),
    neighborhoodSlug: text("neighborhood_slug"),
    regionSlug: text("region_slug"),
    metric: text("metric", { enum: [...RAIN_METRIC_VALUES] }).notNull(),
    valueMm: real("value_mm").notNull(),
    readingAt: text("reading_at").notNull(),
    collectedAt: text("collected_at").notNull(),
  },
  (table) => [
    uniqueIndex("rain_observations_unique_idx").on(
      table.stationId,
      table.metric,
      table.readingAt,
    ),
    index("rain_observations_neighborhood_metric_reading_idx").on(
      table.neighborhoodSlug,
      table.metric,
      table.readingAt,
    ),
    index("rain_observations_reading_idx").on(table.readingAt),
  ],
);

/**
 * Agregado diário por bairro usado na política de retenção: o detalhe
 * (rain_observations) fica limitado a uma janela curta e o histórico
 * permanente fica aqui.
 */
export const rainDaily = pgTable(
  "rain_daily",
  {
    id: text("id").primaryKey(),
    neighborhoodSlug: text("neighborhood_slug").notNull(),
    regionSlug: text("region_slug"),
    day: text("day").notNull(),
    maxMm24h: real("max_mm_24h"),
    avgMm24h: real("avg_mm_24h"),
    stationCount: integer("station_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("rain_daily_unique_idx").on(table.neighborhoodSlug, table.day),
    index("rain_daily_day_idx").on(table.day),
  ],
);

/**
 * Indicadores de risco por bairro, derivados do ISMFI (COPPE/UFRJ).
 */
export const riskIndicators = pgTable(
  "risk_indicators",
  {
    id: text("id").primaryKey(),
    neighborhoodSlug: text("neighborhood_slug").notNull(),
    regionSlug: text("region_slug"),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    kind: text("kind", { enum: [...RISK_KIND_VALUES] }).notNull(),
    class: text("class", { enum: [...RISK_CLASS_VALUES] })
      .notNull()
      .default("nao_avaliado"),
    score: real("score"),
    coverage: real("coverage"),
    computedAt: text("computed_at").notNull(),
    sourceVersion: text("source_version"),
  },
  (table) => [
    uniqueIndex("risk_indicators_unique_idx").on(
      table.neighborhoodSlug,
      table.sourceId,
      table.kind,
    ),
    index("risk_indicators_neighborhood_idx").on(table.neighborhoodSlug),
    index("risk_indicators_kind_idx").on(table.kind),
  ],
);

/**
 * Pontos de drenagem supervisionados (Geo-Rio). Avaliado, mas não usado
 * no produto no momento; mantido para uso futuro.
 */
export const drainagePoints = pgTable(
  "drainage_points",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id").notNull().unique(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    neighborhoodSlug: text("neighborhood_slug"),
    regionSlug: text("region_slug"),
    basin: text("basin"),
    subBasin: text("sub_basin"),
    pointClass: text("point_class"),
    description: text("description"),
    correctiveMeasure: text("corrective_measure"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("drainage_points_neighborhood_idx").on(table.neighborhoodSlug),
    index("drainage_points_latlon_idx").on(table.latitude, table.longitude),
  ],
);

/**
 * Estágio operacional da cidade, atualizado manualmente pelo admin.
 * O registro mais recente por effectiveAt é o vigente.
 */
export const cityStages = pgTable(
  "city_stages",
  {
    id: text("id").primaryKey(),
    stage: text("stage", { enum: [...CITY_STAGE_VALUES] }).notNull(),
    message: text("message"),
    sourceLabel: text("source_label").notNull().default("Atualização manual"),
    effectiveAt: text("effective_at").notNull(),
    createdBy: text("created_by"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("city_stages_effective_idx").on(table.effectiveAt)],
);

/**
 * Histórico de execuções de ingestão para exibir "última atualização"
 * e detectar falhas sem depender apenas dos dados.
 */
export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: text("id").primaryKey(),
    job: text("job").notNull(),
    status: text("status", {
      enum: ["running", "success", "partial", "failed"],
    }).notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    itemsProcessed: integer("items_processed").notNull().default(0),
    errorMessage: text("error_message"),
    notes: text("notes"),
  },
  (table) => [
    index("ingest_runs_job_started_idx").on(table.job, table.startedAt),
  ],
);

export type RainStationRow = typeof rainStations.$inferSelect;
export type RainObservationRow = typeof rainObservations.$inferSelect;
export type RainDailyRow = typeof rainDaily.$inferSelect;
export type RiskIndicatorRow = typeof riskIndicators.$inferSelect;
export type DrainagePointRow = typeof drainagePoints.$inferSelect;
export type CityStageRow = typeof cityStages.$inferSelect;
export type IngestRunRow = typeof ingestRuns.$inferSelect;
