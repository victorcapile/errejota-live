/**
 * Ingestão da chuva observada no Alerta Rio.
 *
 * Fonte: https://alertario.rio.rj.gov.br/upload/Mapa/mc.json
 * (arquivo público usado pelo "Mapa de Chuvas" oficial).
 *
 * Uso:
 *   npm run db:rain
 *
 * O script:
 * 1. baixa o JSON com timeout e retry/backoff;
 * 2. valida o payload e as estações;
 * 3. garante a fonte no catálogo e grava/atualiza as estações;
 * 4. grava as observações (idempotente pela chave estação+métrica+leitura);
 * 5. atualiza o agregado diário e aplica a retenção (90 dias);
 * 6. registra a execução em `ingest_runs`.
 *
 * Nenhum dado pessoal é coletado. Os valores são acumulados de chuva em mm.
 */
import { lt, sql } from "drizzle-orm";
import { closeDb, db } from "@/db";
import {
  rainDaily,
  rainObservations,
  rainStations,
} from "@/db/schema";
import { SOURCE_SEED } from "@/db/seed-data/sources";
import { seedSourceList } from "@/db/seed-sources";
import {
  RAIN_METRIC_VALUES,
  type RainMetric,
} from "@/lib/constants";
import { fetchJson, parseDecimal } from "./lib/http";
import { findBairro, loadBairros } from "./lib/bairros";
import { finishIngestRun, startIngestRun } from "./lib/runs";

const MC_URL = "https://alertario.rio.rj.gov.br/upload/Mapa/mc.json";
const SOURCE_SLUG = "alerta-rio";
const RETENTION_DAYS = 90;
const CHUNK_SIZE = 250;

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

type McStation = {
  name?: unknown;
  lat?: unknown;
  long?: unknown;
  horaLeitura?: unknown;
  [key: string]: unknown;
};

type McPayload = Record<string, McStation | { data?: { dst?: boolean; data?: string } }>;

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

function validatePayload(payload: unknown): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload do Alerta Rio não é um objeto.");
  }
  const entries = Object.entries(payload as McPayload);
  const stations = entries.filter(([key]) => key !== "data");
  if (stations.length < 20) {
    throw new Error(
      `Payload com poucas estações (${stations.length}); esperado ao menos 20.`,
    );
  }
  for (const [key, station] of stations) {
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

async function main() {
  const runId = await startIngestRun("rain");
  let processed = 0;

  try {
    const payload = await fetchJson<McPayload>(MC_URL, {
      timeoutMs: 20_000,
      retries: 3,
      validate: validatePayload,
    });

    const metadata = payload.data as { dst?: boolean; data?: string } | undefined;
    const dst = Boolean(metadata?.dst);
    const now = new Date().toISOString();

    const sourceSeed = SOURCE_SEED.filter(
      (source) => source.slug === SOURCE_SLUG,
    );
    if (sourceSeed.length === 0) {
      throw new Error(`Fonte "${SOURCE_SLUG}" ausente em SOURCE_SEED.`);
    }
    await seedSourceList(sourceSeed);

    const bairros = loadBairros();
    const entries = Object.entries(payload).filter(([key]) => key !== "data");

    let stationsUpserted = 0;
    let skipped = 0;

    for (const [key, raw] of entries) {
      const station = raw as McStation;
      const name = String(station.name).trim();
      const latitude = Number(station.lat);
      const longitude = Number(station.long);
      const readingAt = parseReadingAt(station.horaLeitura, dst);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !readingAt) {
        skipped += 1;
        continue;
      }

      const bairro = findBairro(longitude, latitude, bairros);
      const stationId = `rain_station_${SOURCE_SLUG}_${key}`;

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
          neighborhoodId: bairro ? `neighborhood_${bairro.properties.slug}` : null,
          neighborhoodSlug: bairro?.properties.slug ?? null,
          regionSlug: bairro?.properties.regionSlug ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: rainStations.externalId,
          set: {
            name,
            latitude,
            longitude,
            neighborhoodId: bairro
              ? `neighborhood_${bairro.properties.slug}`
              : null,
            neighborhoodSlug: bairro?.properties.slug ?? null,
            regionSlug: bairro?.properties.regionSlug ?? null,
            isActive: true,
            updatedAt: now,
          },
        });

      stationsUpserted += 1;

      const rows = RAIN_METRIC_VALUES.map((metric) => {
        const value = parseDecimal(station[METRIC_FIELDS[metric]]);
        if (value === null) {
          return null;
        }
        return {
          id: `rain_obs_${SOURCE_SLUG}_${key}_${metric}_${readingAt}`,
          stationId,
          neighborhoodSlug: bairro?.properties.slug ?? null,
          regionSlug: bairro?.properties.regionSlug ?? null,
          metric,
          valueMm: value,
          readingAt,
          collectedAt: now,
        };
      }).filter((row): row is NonNullable<typeof row> => row !== null);

      for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
        const inserted = await db
          .insert(rainObservations)
          .values(rows.slice(index, index + CHUNK_SIZE))
          .onConflictDoNothing()
          .returning({ id: rainObservations.id });
        processed += inserted.length;
      }
    }

    // Agregado diário dos últimos dias (mantém histórico leve).
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await db.execute(sql`
      insert into "rain_daily" (
        "id", "neighborhood_slug", "region_slug", "day",
        "max_mm_24h", "avg_mm_24h", "station_count", "updated_at"
      )
      select
        'daily_' || o."neighborhood_slug" || '_' || substr(o."reading_at", 1, 10),
        o."neighborhood_slug",
        max(o."region_slug"),
        substr(o."reading_at", 1, 10),
        max(o."value_mm") filter (where o."metric" = 'mm_24h'),
        avg(o."value_mm") filter (where o."metric" = 'mm_24h')::real,
        count(distinct o."station_id")::int,
        ${now}
      from "rain_observations" o
      where o."neighborhood_slug" is not null
        and substr(o."reading_at", 1, 10) >= ${since}
      group by o."neighborhood_slug", substr(o."reading_at", 1, 10)
      on conflict ("neighborhood_slug", "day") do update set
        "region_slug" = excluded."region_slug",
        "max_mm_24h" = excluded."max_mm_24h",
        "avg_mm_24h" = excluded."avg_mm_24h",
        "station_count" = excluded."station_count",
        "updated_at" = excluded."updated_at"
    `);

    const cutoff = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    await db
      .delete(rainObservations)
      .where(lt(rainObservations.readingAt, cutoff));

    await finishIngestRun(
      runId,
      skipped > 0 ? "partial" : "success",
      processed,
      skipped > 0 ? `${skipped} estação(ões) ignorada(s) por dados inválidos.` : null,
      `${stationsUpserted} estações; ${processed} observações novas; leitura ${metadata?.data ?? "?"}.`,
    );

    console.log(
      `Chuva: ${stationsUpserted} estações, ${processed} observações novas, ${skipped} ignoradas. Leitura: ${metadata?.data ?? "?"}.`,
    );
    const daily = await db.select({ id: rainDaily.id }).from(rainDaily).limit(1);
    console.log(`Agregado diário disponível: ${daily.length > 0 ? "sim" : "não"}.`);
  } catch (error) {
    await finishIngestRun(runId, "failed", processed, String(error));
    console.error("Falha na ingestão de chuva:", error);
    process.exitCode = 1;
  }
}

void main().finally(async () => {
  await closeDb();
});
