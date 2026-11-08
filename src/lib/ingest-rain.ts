import { eq, inArray, lt, max } from "drizzle-orm";
import { db } from "@/db";
import {
  ingestRuns,
  rainObservations,
  rainStations,
} from "@/db/schema";
import type { RainMetric } from "@/lib/constants";

const MC_URL = "https://alertario.rio.rj.gov.br/upload/Mapa/mc.json";
const SOURCE_SLUG = "alerta-rio";
const FRESH_WINDOW_MS = 4.5 * 60 * 1000;
const CHECK_THROTTLE_MS = 30 * 1000;
const RETENTION_DAYS = 90;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
// A fonte externa é chamada por APIs públicas. Sem timeout, uma resposta
// lenta ou travada do Alerta Rio prende a requisição até o limite da Vercel.
const FETCH_TIMEOUT_MS = 10 * 1000;
let lastPruneAt = 0;

// Janelas usadas pelo card do bairro e pelo cálculo de risco. As demais
// (5 min, 10 min, 15 min, 4 h, mês) continuam disponíveis no script manual.
const INGEST_METRICS: RainMetric[] = ["mm_1h", "mm_24h", "mm_96h"];

const METRIC_FIELDS: Record<RainMetric, string> = {
  mm_5m: "ch05m",
  mm_10m: "ch10m",
  mm_15m: "ch15m",
  mm_1h: "ch01h",
  mm_4h: "ch04h",
  mm_24h: "ch24h",
  mm_96h: "ch96h",
  mm_month: "mes",
};

const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Referer: "https://alertario.rio.rj.gov.br/mapa-de-chuvas/",
} as const;

type McStation = {
  name?: unknown;
  lat?: unknown;
  long?: unknown;
  horaLeitura?: unknown;
  [key: string]: unknown;
};

type McPayload = Record<
  string,
  McStation | { data?: { dst?: boolean; data?: string } }
>;

type IngestResult = {
  stations: number;
  inserted: number;
  readingAt: string | null;
};

let inFlight: Promise<IngestResult> | null = null;
let lastCheckedAt = 0;

function parseDecimal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || normalized === "-") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReadingAt(value: unknown, dst: boolean): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year, hour, minute] = match;
  const offset = dst ? "-02:00" : "-03:00";
  const parsed = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00${offset}`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validatePayload(payload: unknown): asserts payload is McPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload do Alerta Rio não é um objeto.");
  }
  const entries = Object.entries(payload as McPayload).filter(
    ([key]) => key !== "data",
  );
  if (entries.length < 20) {
    throw new Error(
      `Payload com poucas estações (${entries.length}); esperado ao menos 20.`,
    );
  }
  for (const [key, station] of entries) {
    if (!station || typeof station !== "object") {
      throw new Error(`Estação ${key} inválida.`);
    }
    const item = station as McStation;
    if (typeof item.name !== "string" || item.name.trim() === "") {
      throw new Error(`Estação ${key} sem nome.`);
    }
    if (typeof item.lat !== "number" || typeof item.long !== "number") {
      throw new Error(`Estação ${key} sem coordenadas numéricas.`);
    }
  }
}

/**
 * Baixa o arquivo oficial e grava as leituras no banco. Idempotente: pode ser
 * chamado por várias instâncias ao mesmo tempo sem duplicar linhas.
 */
async function ingestRain(): Promise<IngestResult> {
  const startedAt = new Date().toISOString();
  const runId = `ingest_rain_${startedAt}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  await db.insert(ingestRuns).values({
    id: runId,
    job: "rain",
    status: "running",
    startedAt,
    itemsProcessed: 0,
  });

  try {
    const response = await fetch(MC_URL, {
      cache: "no-store",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao baixar ${MC_URL}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      const preview = (await response.text())
        .slice(0, 120)
        .replace(/\s+/g, " ");
      throw new Error(
        `Fonte respondeu ${contentType || "sem content-type"}: ${preview}`,
      );
    }

    const payload: unknown = await response.json();
    validatePayload(payload);

    const metadata = payload.data as { dst?: boolean } | undefined;
    const dst = Boolean(metadata?.dst);
    const collectedAt = new Date().toISOString();

    const existing = await db
      .select({
        id: rainStations.id,
        neighborhoodSlug: rainStations.neighborhoodSlug,
        regionSlug: rainStations.regionSlug,
      })
      .from(rainStations);
    const existingById = new Map(existing.map((row) => [row.id, row]));

    const entries = Object.entries(payload).filter(
      ([key]) => key !== "data",
    );
    let inserted = 0;
    let latestReading: string | null = null;

    for (const [key, raw] of entries) {
      const station = raw as McStation;
      const name = String(station.name).trim();
      const latitude = Number(station.lat);
      const longitude = Number(station.long);
      const readingAt = parseReadingAt(station.horaLeitura, dst);

      if (!readingAt) {
        continue;
      }

      if (!latestReading || readingAt > latestReading) {
        latestReading = readingAt;
      }

      const stationId = `rain_station_${SOURCE_SLUG}_${key}`;
      const known = existingById.get(stationId);

      await db
        .insert(rainStations)
        .values({
          id: stationId,
          externalId: `${SOURCE_SLUG}:${key}`,
          name,
          sourceId: `source_${SOURCE_SLUG}`,
          latitude,
          longitude,
          address: null,
          neighborhoodId: null,
          neighborhoodSlug: null,
          regionSlug: null,
          isActive: true,
          createdAt: collectedAt,
          updatedAt: collectedAt,
        })
        .onConflictDoUpdate({
          target: rainStations.externalId,
          set: { name, latitude, longitude, isActive: true, updatedAt: collectedAt },
        });

      const observationRows = INGEST_METRICS.map((metric) => {
        const value = parseDecimal(station[METRIC_FIELDS[metric]]);
        if (value === null) {
          return null;
        }
        return {
          id: `rain_obs_${SOURCE_SLUG}_${key}_${metric}_${readingAt}`,
          stationId,
          neighborhoodSlug: known?.neighborhoodSlug ?? null,
          regionSlug: known?.regionSlug ?? null,
          metric,
          valueMm: value,
          readingAt,
          collectedAt,
        };
      }).filter((row): row is NonNullable<typeof row> => row !== null);

      if (observationRows.length > 0) {
        const created = await db
          .insert(rainObservations)
          .values(observationRows)
          .onConflictDoNothing()
          .returning({ id: rainObservations.id });
        inserted += created.length;
      }
    }

    if (Date.now() - lastPruneAt > PRUNE_INTERVAL_MS) {
      lastPruneAt = Date.now();
      const cutoff = new Date(
        Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      await db
        .delete(rainObservations)
        .where(lt(rainObservations.readingAt, cutoff))
        .catch(() => {});
    }

    await db
      .update(ingestRuns)
      .set({
        status: "success",
        finishedAt: new Date().toISOString(),
        itemsProcessed: inserted,
        notes: "Ingestão sob demanda (Vercel)",
      })
      .where(eq(ingestRuns.id, runId));

    return { stations: entries.length, inserted, readingAt: latestReading };
  } catch (error) {
    await db
      .update(ingestRuns)
      .set({
        status: "failed",
        finishedAt: new Date().toISOString(),
        errorMessage: String(
          error instanceof Error ? error.message : error,
        ).slice(0, 500),
      })
      .where(eq(ingestRuns.id, runId))
      .catch(() => {});

    throw error;
  }
}

/**
 * Se a última leitura tem mais de ~5 min, busca a fonte e grava. Chamado pelas
 * APIs: o app atualiza a cada 5 min, então a base acompanha sem cron externo.
 * Falhas não derrubam a leitura: a API segue com o último dado disponível.
 */
export async function ensureFreshRain(): Promise<void> {
  const now = Date.now();

  if (inFlight) {
    await inFlight.catch(() => {});
    return;
  }

  // Evita uma consulta ao banco a cada requisição na mesma instância.
  if (now - lastCheckedAt < CHECK_THROTTLE_MS) {
    return;
  }
  lastCheckedAt = now;

  try {
    const rows = await db
      .select({
        metric: rainObservations.metric,
        latest: max(rainObservations.readingAt),
      })
      .from(rainObservations)
      .where(inArray(rainObservations.metric, INGEST_METRICS))
      .groupBy(rainObservations.metric);

    const latestByMetric = new Map(
      rows.map((row) => [row.metric, row.latest]),
    );
    const allFresh = INGEST_METRICS.every((metric) => {
      const latest = latestByMetric.get(metric);
      if (!latest) {
        return false;
      }
      const timestamp = new Date(latest).getTime();
      return Number.isFinite(timestamp) && now - timestamp < FRESH_WINDOW_MS;
    });

    if (allFresh) {
      return;
    }

    // Evita que várias instâncias disparem a mesma ingestão em sequência.
    const [lastRun] = await db
      .select({ startedAt: max(ingestRuns.startedAt) })
      .from(ingestRuns)
      .where(eq(ingestRuns.job, "rain"));
    const lastRunAt = lastRun?.startedAt
      ? new Date(lastRun.startedAt).getTime()
      : 0;
    if (Number.isFinite(lastRunAt) && now - lastRunAt < 60_000) {
      return;
    }

    inFlight = ingestRain();
    await inFlight;
  } catch (error) {
    console.error("[rain] ingestão sob demanda falhou:", error);
  } finally {
    inFlight = null;
  }
}
