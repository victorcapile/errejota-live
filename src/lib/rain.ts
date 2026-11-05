import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cityStages,
  ingestRuns,
  neighborhoods,
  rainStations,
  regions,
  riskIndicators,
} from "@/db/schema";
import type { RainMetric } from "./constants";
import { distanceMeters } from "./geo";
import type {
  ConditionsSummary,
  NeighborhoodCondition,
  RainReadingSummary,
  RainStationLatest,
} from "./types";

/** Janela usada para considerar uma leitura como "atual". */
const OBSERVATION_WINDOW_HOURS = 48;

type LatestRow = {
  stationId: string;
  metric: RainMetric;
  valueMm: number;
  readingAt: string;
};

/** O driver local (PGlite) e o remoto (postgres-js) devolvem formatos diferentes. */
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function loadLatestObservations(metric?: RainMetric): Promise<LatestRow[]> {
  const cutoff = new Date(
    Date.now() - OBSERVATION_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const result = await db.execute(sql`
    select distinct on (o."station_id", o."metric")
      o."station_id" as "stationId",
      o."metric" as "metric",
      o."value_mm" as "valueMm",
      o."reading_at" as "readingAt"
    from "rain_observations" o
    where o."reading_at" >= ${cutoff}
      ${metric ? sql`and o."metric" = ${metric}` : sql``}
    order by o."station_id", o."metric", o."reading_at" desc
  `);

  return rowsOf<LatestRow>(result);
}

export async function listRainReadings(params: {
  region?: string;
  neighborhood?: string;
  metric?: RainMetric;
  limit?: number;
}): Promise<RainReadingSummary> {
  const stations = await db
    .select({
      id: rainStations.id,
      name: rainStations.name,
      neighborhoodSlug: rainStations.neighborhoodSlug,
      regionSlug: rainStations.regionSlug,
      latitude: rainStations.latitude,
      longitude: rainStations.longitude,
    })
    .from(rainStations)
    .where(eq(rainStations.isActive, true));

  const latest = await loadLatestObservations(params.metric);
  const byStation = new Map<string, Partial<Record<RainMetric, number>>>();
  const readingAtByStation = new Map<string, string>();

  for (const row of latest) {
    const metrics = byStation.get(row.stationId) ?? {};
    metrics[row.metric] = row.valueMm;
    byStation.set(row.stationId, metrics);

    const current = readingAtByStation.get(row.stationId);
    if (!current || row.readingAt > current) {
      readingAtByStation.set(row.stationId, row.readingAt);
    }
  }

  const items: RainStationLatest[] = stations
    .filter(
      (station) =>
        (!params.region || station.regionSlug === params.region) &&
        (!params.neighborhood ||
          station.neighborhoodSlug === params.neighborhood),
    )
    .map((station) => ({
      id: station.id,
      name: station.name,
      neighborhoodSlug: station.neighborhoodSlug,
      regionSlug: station.regionSlug,
      latitude: station.latitude,
      longitude: station.longitude,
      metrics: byStation.get(station.id) ?? {},
      readingAt: readingAtByStation.get(station.id) ?? null,
    }))
    .filter((station) => Object.keys(station.metrics).length > 0);

  const limit = params.limit ?? items.length;
  const limited = items.slice(0, limit);
  const updatedAt = limited.reduce<string | null>((latestAt, station) => {
    if (!station.readingAt) return latestAt;
    if (!latestAt) return station.readingAt;
    return station.readingAt > latestAt ? station.readingAt : latestAt;
  }, null);

  return { updatedAt, items: limited };
}

export async function listNeighborhoodConditions(params: {
  region?: string;
  neighborhood?: string;
  metric?: RainMetric;
  limit?: number;
}): Promise<ConditionsSummary> {
  const metric: RainMetric = params.metric ?? "mm_1h";

  // Consultas sequenciais: o pooler do Supabase e o cliente com max: 1 não
  // lidam bem com várias queries simultâneas na mesma conexão.
  const stationRows = await db
    .select({
      id: rainStations.id,
      name: rainStations.name,
      neighborhoodSlug: rainStations.neighborhoodSlug,
      regionSlug: rainStations.regionSlug,
      latitude: rainStations.latitude,
      longitude: rainStations.longitude,
    })
    .from(rainStations)
    .where(eq(rainStations.isActive, true));

  const latest = await loadLatestObservations(metric);

  const riskRows = await db
    .select({
      neighborhoodSlug: riskIndicators.neighborhoodSlug,
      class: riskIndicators.class,
      score: riskIndicators.score,
      sourceId: riskIndicators.sourceId,
    })
    .from(riskIndicators)
    .where(eq(riskIndicators.kind, "flood_ismfi"));

  const hoodRows = await db
    .select({
      slug: neighborhoods.slug,
      name: neighborhoods.name,
      regionSlug: regions.slug,
      latitude: neighborhoods.latitude,
      longitude: neighborhoods.longitude,
    })
    .from(neighborhoods)
    .innerJoin(regions, eq(regions.id, neighborhoods.regionId));

  const stageRows = await db
    .select()
    .from(cityStages)
    .orderBy(desc(cityStages.effectiveAt))
    .limit(1);

  const latestByStation = new Map(
    latest.map((row) => [row.stationId, row]),
  );
  const stationNeighborhood = new Map(
    stationRows.map((station) => [station.id, station.neighborhoodSlug]),
  );

  const rainByNeighborhood = new Map<
    string,
    {
      max: number;
      count: number;
      readingAt: string;
      stationName: string;
    }
  >();

  for (const row of latest) {
    const slug = stationNeighborhood.get(row.stationId);
    if (!slug) continue;
    const station = stationRows.find((item) => item.id === row.stationId);
    const stationName = station?.name ?? "estação";
    const current = rainByNeighborhood.get(slug);
    if (!current) {
      rainByNeighborhood.set(slug, {
        max: row.valueMm,
        count: 1,
        readingAt: row.readingAt,
        stationName,
      });
      continue;
    }
    if (row.valueMm > current.max) {
      current.max = row.valueMm;
      current.stationName = stationName;
    }
    current.count += 1;
    if (row.readingAt > current.readingAt) {
      current.readingAt = row.readingAt;
    }
  }

  /** Estação ativa mais próxima (até 5 km) com leitura recente. */
  function nearestStation(hood: {
    latitude: number | null;
    longitude: number | null;
  }) {
    if (hood.latitude === null || hood.longitude === null) {
      return null;
    }
    let best:
      | {
          stationName: string;
          valueMm: number;
          readingAt: string;
          distanceKm: number;
        }
      | null = null;

    for (const station of stationRows) {
      const reading = latestByStation.get(station.id);
      if (!reading) continue;
      const distanceKm =
        distanceMeters(
          { latitude: hood.latitude, longitude: hood.longitude },
          { latitude: station.latitude, longitude: station.longitude },
        ) / 1000;
      if (distanceKm > 5) continue;
      if (!best || distanceKm < best.distanceKm) {
        best = {
          stationName: station.name,
          valueMm: reading.valueMm,
          readingAt: reading.readingAt,
          distanceKm,
        };
      }
    }

    return best;
  }

  const riskByNeighborhood = new Map(
    riskRows.map((row) => [row.neighborhoodSlug, row]),
  );

  const items: NeighborhoodCondition[] = hoodRows
    .filter(
      (hood) =>
        (!params.region || hood.regionSlug === params.region) &&
        (!params.neighborhood || hood.slug === params.neighborhood),
    )
    .map((hood) => {
      const rain = rainByNeighborhood.get(hood.slug);
      const nearest = rain ? null : nearestStation(hood);
      const risk = riskByNeighborhood.get(hood.slug);

      return {
        neighborhoodSlug: hood.slug,
        neighborhoodName: hood.name,
        regionSlug: hood.regionSlug,
        rainMaxMm: rain?.max ?? nearest?.valueMm ?? null,
        rainStationCount: rain?.count ?? (nearest ? 1 : 0),
        rainReadingAt: rain?.readingAt ?? nearest?.readingAt ?? null,
        rainStationName: rain?.stationName ?? nearest?.stationName ?? null,
        rainDistanceKm: rain ? 0 : nearest?.distanceKm ?? null,
        riskClass: risk?.class ?? null,
        riskScore: risk?.score ?? null,
        riskSourceId: risk?.sourceId ?? null,
      };
    });

  const limitedItems = params.limit ? items.slice(0, params.limit) : items;

  const updatedAt = limitedItems.reduce<string | null>((latestAt, item) => {
    if (!item.rainReadingAt) return latestAt;
    if (!latestAt) return item.rainReadingAt;
    return item.rainReadingAt > latestAt ? item.rainReadingAt : latestAt;
  }, null);

  const stageRow = stageRows[0];
  const stage = stageRow
    ? {
        stage: stageRow.stage,
        message: stageRow.message,
        sourceLabel: stageRow.sourceLabel,
        effectiveAt: stageRow.effectiveAt,
      }
    : null;

  return { stage, updatedAt, items: limitedItems };
}

export type IngestRunSummary = {
  job: string;
  status: "running" | "success" | "partial" | "failed";
  startedAt: string;
  finishedAt: string | null;
  itemsProcessed: number;
  errorMessage: string | null;
};

export async function getLastIngestRun(
  job: string,
): Promise<IngestRunSummary | null> {
  const [row] = await db
    .select({
      job: ingestRuns.job,
      status: ingestRuns.status,
      startedAt: ingestRuns.startedAt,
      finishedAt: ingestRuns.finishedAt,
      itemsProcessed: ingestRuns.itemsProcessed,
      errorMessage: ingestRuns.errorMessage,
    })
    .from(ingestRuns)
    .where(eq(ingestRuns.job, job))
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);

  return row ?? null;
}

export async function getLatestCityStage() {
  const [row] = await db
    .select()
    .from(cityStages)
    .orderBy(desc(cityStages.effectiveAt))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    stage: row.stage,
    message: row.message,
    sourceLabel: row.sourceLabel,
    effectiveAt: row.effectiveAt,
  };
}
