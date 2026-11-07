import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { riskIndicators, safetyFacilities } from "@/db/schema";
import type { RiskClass, SafetyFacilityKind } from "./constants";

export type SafetyFacility = {
  id: string;
  kind: SafetyFacilityKind;
  name: string;
  address: string | null;
  neighborhoodSlug: string | null;
  regionSlug: string | null;
  latitude: number;
  longitude: number;
  sourceLabel: string;
  sourceUrl: string | null;
  attribution: string;
  sourceUpdatedAt: string | null;
  syncedAt: string;
  metadata: string | null;
  riskClass: RiskClass | null;
  nearHighRisk: boolean;
};

export type SafetySummary = {
  updatedAt: string | null;
  items: SafetyFacility[];
};

export type SafetyFilters = {
  kind?: SafetyFacilityKind | "all";
  region?: string;
  neighborhood?: string;
  limit?: number;
};

export async function listSafetyFacilities(
  filters: SafetyFilters = {},
): Promise<SafetySummary> {
  const conditions = [eq(safetyFacilities.isActive, true)];

  if (filters.kind && filters.kind !== "all") {
    conditions.push(eq(safetyFacilities.kind, filters.kind));
  }
  if (filters.region) {
    conditions.push(eq(safetyFacilities.regionSlug, filters.region));
  }
  if (filters.neighborhood) {
    conditions.push(
      eq(safetyFacilities.neighborhoodSlug, filters.neighborhood),
    );
  }

  const rows = await db
    .select()
    .from(safetyFacilities)
    .where(and(...conditions))
    .limit(Math.min(Math.max(filters.limit ?? 1000, 1), 2000));

  const slugs = Array.from(
    new Set(
      rows
        .map((row) => row.neighborhoodSlug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );

  const risks =
    slugs.length > 0
      ? await db
          .select({
            slug: riskIndicators.neighborhoodSlug,
            class: riskIndicators.class,
          })
          .from(riskIndicators)
          .where(
            and(
              eq(riskIndicators.kind, "flood_ismfi"),
              inArray(riskIndicators.neighborhoodSlug, slugs),
            ),
          )
      : [];

  const riskBySlug = new Map(
    risks.map((row) => [row.slug, row.class as RiskClass]),
  );

  const items: SafetyFacility[] = rows.map((row) => {
    const riskClass = row.neighborhoodSlug
      ? (riskBySlug.get(row.neighborhoodSlug) ?? null)
      : null;
    return {
      id: row.id,
      kind: row.kind as SafetyFacilityKind,
      name: row.name,
      address: row.address,
      neighborhoodSlug: row.neighborhoodSlug,
      regionSlug: row.regionSlug,
      latitude: row.latitude,
      longitude: row.longitude,
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      attribution: row.attribution,
      sourceUpdatedAt: row.sourceUpdatedAt,
      syncedAt: row.syncedAt,
      metadata: row.metadata,
      riskClass,
      nearHighRisk: riskClass === "alta",
    };
  });

  const updatedAt = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.syncedAt;
    return item.syncedAt > latest ? item.syncedAt : latest;
  }, null);

  return { updatedAt, items };
}

export async function getSafetySummary(): Promise<
  Record<SafetyFacilityKind, number> & { total: number }
> {
  const rows = await db
    .select({ kind: safetyFacilities.kind, value: count() })
    .from(safetyFacilities)
    .where(eq(safetyFacilities.isActive, true))
    .groupBy(safetyFacilities.kind);

  const summary = {
    support_point: 0,
    shelter: 0,
    hospital: 0,
    total: 0,
  };

  for (const row of rows) {
    const kind = row.kind as SafetyFacilityKind;
    if (kind in summary) {
      const value = Number(row.value ?? 0);
      summary[kind] = value;
      summary.total += value;
    }
  }

  return summary;
}

export async function getSafetyFacility(
  id: string,
): Promise<SafetyFacility | null> {
  const [row] = await db
    .select()
    .from(safetyFacilities)
    .where(eq(safetyFacilities.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const [risk] = row.neighborhoodSlug
    ? await db
        .select({ class: riskIndicators.class })
        .from(riskIndicators)
        .where(
          and(
            eq(riskIndicators.kind, "flood_ismfi"),
            eq(riskIndicators.neighborhoodSlug, row.neighborhoodSlug),
          ),
        )
        .limit(1)
    : [];

  const riskClass = (risk?.class as RiskClass | undefined) ?? null;

  return {
    id: row.id,
    kind: row.kind as SafetyFacilityKind,
    name: row.name,
    address: row.address,
    neighborhoodSlug: row.neighborhoodSlug,
    regionSlug: row.regionSlug,
    latitude: row.latitude,
    longitude: row.longitude,
    sourceLabel: row.sourceLabel,
    sourceUrl: row.sourceUrl,
    attribution: row.attribution,
    sourceUpdatedAt: row.sourceUpdatedAt,
    syncedAt: row.syncedAt,
    metadata: row.metadata,
    riskClass,
    nearHighRisk: riskClass === "alta",
  };
}

/** Contagem rápida para o admin. */
export async function getSafetyCounts() {
  const rows = await db
    .select({
      kind: safetyFacilities.kind,
      total: sql<number>`count(*)::int`,
    })
    .from(safetyFacilities)
    .where(eq(safetyFacilities.isActive, true))
    .groupBy(safetyFacilities.kind);
  return rows;
}
