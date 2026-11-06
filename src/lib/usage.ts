import { and, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  neighborhoods,
  regions,
  usageEvents,
  visitorLabels,
  visitorLocations,
} from "@/db/schema";
import type { DeviceType } from "./constants";

export type NeighborhoodUsage = {
  slug: string;
  name: string;
  count: number;
};

export type CameraUsage = {
  cameraId: string;
  name: string;
  neighborhoodSlug: string | null;
  neighborhoodName: string | null;
  count: number;
};

export type DailyUsage = {
  day: string;
  visitors: number;
  count: number;
};

export type RegionUsage = {
  name: string;
  count: number;
};

export type HourlyUsage = {
  hour: string;
  visitors: number;
  count: number;
};

export type DeviceVisitors = {
  device: DeviceType;
  visitors: number;
};

export type VisitorLocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  street: string | null;
  neighborhood: string | null;
  device: DeviceType;
  createdAt: string;
};

export type VisitorLocationUsage = {
  key: string;
  ip: string | null;
  ipHash: string | null;
  nickname: string | null;
  points: number;
  lastSeen: string;
  latest: VisitorLocationPoint | null;
  history: VisitorLocationPoint[];
};

export type MonthlyUsage = {
  month: string;
  visitors: number;
  networks: number;
  pageViews: number;
};

export type UsageStats = {
  totals: {
    pageViews: number;
    neighborhoodViews: number;
    cameraClicks: number;
    sessions: number;
  };
  neighborhoods: NeighborhoodUsage[];
  cameras: CameraUsage[];
  daily: DailyUsage[];
  regions: RegionUsage[];
  hourly: HourlyUsage[];
  monthly: MonthlyUsage[];
  devices: DeviceVisitors[];
  locations: VisitorLocationUsage[];
};

export const LOCATION_RETENTION_DAYS = 30;
export const EVENT_RETENTION_DAYS = 365;
const MONTHLY_HISTORY_MONTHS = 12;

const EMPTY_STATS: UsageStats = {
  totals: { pageViews: 0, neighborhoodViews: 0, cameraClicks: 0, sessions: 0 },
  neighborhoods: [],
  cameras: [],
  daily: [],
  regions: [],
  hourly: [],
  monthly: [],
  devices: [],
  locations: [],
};

/**
 * Coordenadas compartilhadas voluntariamente no botão de localização.
 * Fica isolada em try/catch para que uma tabela ausente em produção não
 * derrube o restante do painel.
 */
async function loadVisitorLocations(): Promise<VisitorLocationUsage[]> {
  try {
    const locationSince = new Date(
      Date.now() - LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const locationVisitorKey = sql<string>`coalesce(nullif(${visitorLocations.sessionId}, ''), ${visitorLocations.ipHash})`;

    const locationCountRows = await db
      .select({
        key: locationVisitorKey,
        points: sql<number>`count(*)::int`,
        lastSeen: sql<string>`max(${visitorLocations.createdAt})`,
      })
      .from(visitorLocations)
      .where(
        and(
          sql`${locationVisitorKey} is not null`,
          gte(visitorLocations.createdAt, locationSince),
        ),
      )
      .groupBy(locationVisitorKey)
      .orderBy(desc(sql`max(${visitorLocations.createdAt})`))
      .limit(50);

    const locationRows = await db
      .select({
        key: locationVisitorKey,
        ip: visitorLocations.ip,
        ipHash: visitorLocations.ipHash,
        nickname: visitorLabels.nickname,
        latitude: visitorLocations.latitude,
        longitude: visitorLocations.longitude,
        accuracy: visitorLocations.accuracy,
        street: visitorLocations.street,
        neighborhood: visitorLocations.neighborhood,
        device: visitorLocations.device,
        createdAt: visitorLocations.createdAt,
      })
      .from(visitorLocations)
      .leftJoin(
        visitorLabels,
        eq(visitorLabels.visitorKey, locationVisitorKey),
      )
      .where(
        and(
          sql`${locationVisitorKey} is not null`,
          gte(visitorLocations.createdAt, locationSince),
        ),
      )
      .orderBy(desc(visitorLocations.createdAt))
      .limit(500);

    const locationPoints = new Map<string, VisitorLocationUsage>();
    for (const row of locationRows) {
      const key = row.key;
      if (!key) continue;
      const point: VisitorLocationPoint = {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracy: row.accuracy === null ? null : Number(row.accuracy),
        street: row.street ?? null,
        neighborhood: row.neighborhood ?? null,
        device: row.device ?? "unknown",
        createdAt: row.createdAt,
      };
      const entry = locationPoints.get(key);
      if (!entry) {
        locationPoints.set(key, {
          key,
          ip: row.ip ?? null,
          ipHash: row.ipHash ?? null,
          nickname: row.nickname ?? null,
          points: 1,
          lastSeen: row.createdAt,
          latest: point,
          history: [point],
        });
      } else {
        entry.points += 1;
        if (entry.history.length < 10) {
          entry.history.push(point);
        }
      }
    }

    return locationCountRows
      .map((row) => {
        const key = row.key ?? "";
        const entry = locationPoints.get(key);
        return {
          key,
          ip: entry?.ip ?? null,
          ipHash: entry?.ipHash ?? null,
          nickname: entry?.nickname ?? null,
          points: Number(row.points ?? 0),
          lastSeen: row.lastSeen ?? "",
          latest: entry?.latest ?? null,
          history: entry?.history ?? [],
        };
      })
      .filter((item) => item.key);
  } catch (error) {
    console.error("Falha ao carregar localizações:", error);
    return [];
  }
}

export async function getUsageStats(): Promise<UsageStats> {
  try {
    const localDay = sql<string>`to_char((${usageEvents.createdAt})::timestamptz at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`;
    const localHour = sql<string>`to_char((${usageEvents.createdAt})::timestamptz at time zone 'America/Sao_Paulo', 'HH24')`;
    const localMonth = sql<string>`to_char((${usageEvents.createdAt})::timestamptz at time zone 'America/Sao_Paulo', 'YYYY-MM')`;
    const visitorKey = sql<string>`coalesce(nullif(${usageEvents.visitorHash}, ''), nullif(${usageEvents.ipHash}, ''), nullif(${usageEvents.sessionId}, ''))`;

    const [totals] = await db
      .select({
        pageViews: sql<number>`count(*) filter (where ${usageEvents.type} = 'page_view')::int`,
        neighborhoodViews: sql<number>`count(*) filter (where ${usageEvents.type} = 'neighborhood_view')::int`,
        cameraClicks: sql<number>`count(*) filter (where ${usageEvents.type} = 'camera_click')::int`,
        sessions: sql<number>`count(distinct ${usageEvents.sessionId})::int`,
      })
      .from(usageEvents);

    const neighborhoodRows = await db
      .select({
        slug: usageEvents.neighborhoodSlug,
        name: neighborhoods.name,
        count: sql<number>`count(*)::int`,
      })
      .from(usageEvents)
      .leftJoin(
        neighborhoods,
        eq(neighborhoods.slug, usageEvents.neighborhoodSlug),
      )
      .where(
        and(
          eq(usageEvents.type, "neighborhood_view"),
          isNotNull(usageEvents.neighborhoodSlug),
        ),
      )
      .groupBy(usageEvents.neighborhoodSlug, neighborhoods.name)
      .orderBy(desc(sql`count(*)`))
      .limit(12);

    const cameraRows = await db
      .select({
        cameraId: usageEvents.cameraId,
        name: sql<string>`max(${usageEvents.cameraName})`,
        neighborhoodSlug: usageEvents.neighborhoodSlug,
        neighborhoodName: neighborhoods.name,
        count: sql<number>`count(*)::int`,
      })
      .from(usageEvents)
      .leftJoin(
        neighborhoods,
        eq(neighborhoods.slug, usageEvents.neighborhoodSlug),
      )
      .where(
        and(
          eq(usageEvents.type, "camera_click"),
          isNotNull(usageEvents.cameraId),
        ),
      )
      .groupBy(
        usageEvents.cameraId,
        usageEvents.neighborhoodSlug,
        neighborhoods.name,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();
    const dailyRows = await db
      .select({
        day: localDay,
        visitors: sql<number>`count(distinct ${visitorKey})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.type, "page_view"),
          gte(usageEvents.createdAt, since),
        ),
      )
      .groupBy(localDay)
      .orderBy(localDay);

    const regionRows = await db
      .select({
        name: regions.name,
        count: sql<number>`count(*)::int`,
      })
      .from(usageEvents)
      .innerJoin(
        neighborhoods,
        eq(neighborhoods.slug, usageEvents.neighborhoodSlug),
      )
      .innerJoin(regions, eq(regions.id, neighborhoods.regionId))
      .where(eq(usageEvents.type, "neighborhood_view"))
      .groupBy(regions.name)
      .orderBy(desc(sql`count(*)`))
      .limit(8);

    const monthlySince = new Date();
    monthlySince.setUTCMonth(
      monthlySince.getUTCMonth() - (MONTHLY_HISTORY_MONTHS - 1),
    );
    monthlySince.setUTCDate(1);
    monthlySince.setUTCHours(3, 0, 0, 0);

    const monthlyRows = await db
      .select({
        month: localMonth,
        visitors: sql<number>`count(distinct concat(${visitorKey}, '|', ${localDay}))::int`,
        networks: sql<number>`count(distinct ${usageEvents.ipHash})::int`,
        pageViews: sql<number>`count(*) filter (where ${usageEvents.type} = 'page_view')::int`,
      })
      .from(usageEvents)
      .where(
        and(
          sql`${visitorKey} is not null`,
          gte(usageEvents.createdAt, monthlySince.toISOString()),
        ),
      )
      .groupBy(localMonth)
      .orderBy(desc(localMonth));

    const deviceSince = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const deviceRows = await db
      .select({
        device: usageEvents.device,
        visitors: sql<number>`count(distinct concat(${visitorKey}, '|', ${localDay}))::int`,
      })
      .from(usageEvents)
      .where(
        and(
          sql`${visitorKey} is not null`,
          gte(usageEvents.createdAt, deviceSince),
        ),
      )
      .groupBy(usageEvents.device);

    const locations = await loadVisitorLocations();

    const since24h = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const hourlyRows = await db
      .select({
        hour: localHour,
        visitors: sql<number>`count(distinct ${visitorKey})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.type, "page_view"),
          gte(usageEvents.createdAt, since24h),
        ),
      )
      .groupBy(localHour)
      .orderBy(localHour);

    return {
      totals: {
        pageViews: Number(totals?.pageViews ?? 0),
        neighborhoodViews: Number(totals?.neighborhoodViews ?? 0),
        cameraClicks: Number(totals?.cameraClicks ?? 0),
        sessions: Number(totals?.sessions ?? 0),
      },
      neighborhoods: neighborhoodRows.map((row) => ({
        slug: row.slug ?? "",
        name: row.name ?? row.slug ?? "Sem bairro",
        count: Number(row.count ?? 0),
      })),
      cameras: cameraRows.map((row) => ({
        cameraId: row.cameraId ?? "",
        name: row.name ?? "Câmera",
        neighborhoodSlug: row.neighborhoodSlug ?? null,
        neighborhoodName: row.neighborhoodName ?? null,
        count: Number(row.count ?? 0),
      })),
      daily: dailyRows.map((row) => ({
        day: row.day,
        visitors: Number(row.visitors ?? 0),
        count: Number(row.count ?? 0),
      })),
      regions: regionRows.map((row) => ({
        name: row.name,
        count: Number(row.count ?? 0),
      })),
      hourly: hourlyRows.map((row) => ({
        hour: row.hour,
        visitors: Number(row.visitors ?? 0),
        count: Number(row.count ?? 0),
      })),
      monthly: monthlyRows.map((row) => ({
        month: row.month,
        visitors: Number(row.visitors ?? 0),
        networks: Number(row.networks ?? 0),
        pageViews: Number(row.pageViews ?? 0),
      })),
      devices: deviceRows
        .map((row) => ({
          device: (row.device ?? "unknown") as DeviceType,
          visitors: Number(row.visitors ?? 0),
        }))
        .filter((item) => item.visitors > 0)
        .sort((a, b) => b.visitors - a.visitors),
      locations,
    };
  } catch (error) {
    console.error("Falha ao carregar estatísticas de uso:", error);
    return EMPTY_STATS;
  }
}

/**
 * Remove localizações detalhadas antigas (30 dias) e eventos antigos
 * (12 meses). O comparativo mensal usa apenas os eventos agregados.
 */
export async function pruneUsageData(): Promise<{
  locations: number;
  events: number;
}> {
  const now = Date.now();
  const locationCutoff = new Date(
    now - LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const eventCutoff = new Date(
    now - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const deletedLocations = await db
    .delete(visitorLocations)
    .where(lt(visitorLocations.createdAt, locationCutoff))
    .returning({ id: visitorLocations.id });

  const deletedEvents = await db
    .delete(usageEvents)
    .where(lt(usageEvents.createdAt, eventCutoff))
    .returning({ id: usageEvents.id });

  return {
    locations: deletedLocations.length,
    events: deletedEvents.length,
  };
}
