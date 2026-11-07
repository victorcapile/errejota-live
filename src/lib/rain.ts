import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingestRuns,
  neighborhoods,
  rainStations,
  regions,
  riskIndicators,
} from "@/db/schema";
import type { RainMetric } from "./constants";
import { getCityStage } from "./city-stage";
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

  // Carrega as três janelas de uma vez; o card sempre mostra 1h/24h/96h.
  const latest = await loadLatestObservations();

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

  const stageResult = await getCityStage();
  const lastRainRun = await getLastIngestRun("rain");

  function rainStatusFor(
    readingAt: string | null,
  ): "ok" | "stale" | "unavailable" {
    if (!readingAt) {
      return "unavailable";
    }
    const timestamp = new Date(readingAt).getTime();
    if (!Number.isFinite(timestamp)) {
      return "unavailable";
    }
    const ageMinutes = (Date.now() - timestamp) / 60_000;
    if (lastRainRun?.status === "failed" && ageMinutes > 10) {
      return "unavailable";
    }
    return ageMinutes > 30 ? "stale" : "ok";
  }

  type StationMetrics = Partial<
    Record<RainMetric, { valueMm: number; readingAt: string }>
  >;

  const metricsByStation = new Map<string, StationMetrics>();
  for (const row of latest) {
    const metrics = metricsByStation.get(row.stationId) ?? {};
    metrics[row.metric] = {
      valueMm: row.valueMm,
      readingAt: row.readingAt,
    };
    metricsByStation.set(row.stationId, metrics);
  }

  function summarizeMetrics(stationId: string) {
    const metrics = metricsByStation.get(stationId);
    if (!metrics) {
      return null;
    }

    const h1 = metrics.mm_1h;
    const h24 = metrics.mm_24h;
    const h96 = metrics.mm_96h;
    if (!h1 && !h24 && !h96) {
      return null;
    }

    let readingAt: string | null = null;
    for (const item of [h1, h24, h96]) {
      if (item && (!readingAt || item.readingAt > readingAt)) {
        readingAt = item.readingAt;
      }
    }

    return {
      mm1h: h1?.valueMm ?? null,
      mm24h: h24?.valueMm ?? null,
      mm96h: h96?.valueMm ?? null,
      readingAt,
    };
  }

  function highestFirst(
    a: { metrics: NonNullable<ReturnType<typeof summarizeMetrics>> },
    b: { metrics: NonNullable<ReturnType<typeof summarizeMetrics>> },
  ) {
    for (const key of ["mm1h", "mm24h", "mm96h"] as const) {
      const left = a.metrics[key] ?? -1;
      const right = b.metrics[key] ?? -1;
      if (right !== left) {
        return right - left;
      }
    }
    return 0;
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
      const localStations = stationRows
        .filter((station) => station.neighborhoodSlug === hood.slug)
        .map((station) => ({
          station,
          metrics: summarizeMetrics(station.id),
        }))
        .filter(
          (item): item is {
            station: (typeof stationRows)[number];
            metrics: NonNullable<ReturnType<typeof summarizeMetrics>>;
          } => item.metrics !== null,
        )
        .sort(highestFirst);

      let selected:
        | {
            station: (typeof stationRows)[number];
            metrics: NonNullable<ReturnType<typeof summarizeMetrics>>;
            distanceKm: number;
            count: number;
          }
        | null = null;

      if (localStations.length > 0) {
        selected = {
          ...localStations[0],
          distanceKm: 0,
          count: localStations.length,
        };
      } else if (hood.latitude !== null && hood.longitude !== null) {
        for (const station of stationRows) {
          const metrics = summarizeMetrics(station.id);
          if (!metrics) continue;
          const distanceKm =
            distanceMeters(
              { latitude: hood.latitude, longitude: hood.longitude },
              { latitude: station.latitude, longitude: station.longitude },
            ) / 1000;
          if (distanceKm > 5) continue;
          if (!selected || distanceKm < selected.distanceKm) {
            selected = { station, metrics, distanceKm, count: 1 };
          }
        }
      }

      const risk = riskByNeighborhood.get(hood.slug);

      return {
        neighborhoodSlug: hood.slug,
        neighborhoodName: hood.name,
        regionSlug: hood.regionSlug,
        rain1hMm: selected?.metrics.mm1h ?? null,
        rain24hMm: selected?.metrics.mm24h ?? null,
        rain96hMm: selected?.metrics.mm96h ?? null,
        rainStatus: rainStatusFor(selected?.metrics.readingAt ?? null),
        rainStationCount: selected?.count ?? 0,
        rainReadingAt: selected?.metrics.readingAt ?? null,
        rainStationId: selected?.station.id ?? null,
        rainStationName: selected?.station.name ?? null,
        rainDistanceKm: selected?.distanceKm ?? null,
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

  return {
    stage: stageResult.stage,
    stageStatus: stageResult.status,
    updatedAt,
    items: limitedItems,
  };
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

export { getLatestCityStage } from "./city-stage";
