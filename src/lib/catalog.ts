import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  like,
  max,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { ensureCameraSchema } from "@/db/ensure-schema";
import {
  cameras,
  neighborhoods,
  newsItems,
  regions,
  sources,
  sourceStatusChecks,
  sourceTags,
  tags,
  type CameraRow,
  type NeighborhoodRow,
  type RegionRow,
  type SourceRow,
} from "@/db/schema";
import {
  AVAILABILITY_STATUS_VALUES,
  CATALOG_PAGE_SIZE,
  CATEGORY_VALUES,
  PERMISSION_STATUS_VALUES,
  REGION_META,
  REGION_VALUES,
  SCOPE_VALUES,
  type AvailabilityStatus,
  type Category,
  type PermissionStatus,
  type RegionSlug,
  type Scope,
  type SortOption,
} from "./constants";
import { NEIGHBORHOOD_SEED } from "@/db/seed-data/neighborhoods";
import { normalizeText, tokenizeSearch } from "./text";
import type {
  Camera,
  CatalogMeta,
  CatalogQuery,
  CatalogStats,
  MapMeta,
  NeighborhoodSummary,
  NeighborhoodWithCount,
  NewsItem,
  NewsTopic,
  Paginated,
  RegionSummary,
  Source,
  SourceDetail,
  StatusCheck,
  TagSummary,
} from "./types";

type SourceListRow = {
  source: SourceRow;
  region: RegionRow | null;
  neighborhood: NeighborhoodRow | null;
};

function mapRegion(region: RegionRow | null): RegionSummary | null {
  if (!region) {
    return null;
  }
  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    description: region.description,
    sortOrder: region.sortOrder,
  };
}

function mapNeighborhood(
  neighborhood: NeighborhoodRow | null,
  fallbackRegion: RegionRow | null,
): NeighborhoodSummary | null {
  if (!neighborhood) {
    return null;
  }
  return {
    id: neighborhood.id,
    slug: neighborhood.slug,
    name: neighborhood.name,
    regionId: neighborhood.regionId,
    regionSlug: fallbackRegion?.slug ?? "",
    regionName: fallbackRegion?.name ?? "",
    latitude: neighborhood.latitude,
    longitude: neighborhood.longitude,
    locationPrecision: neighborhood.locationPrecision,
    summary: neighborhood.summary,
  };
}

function mapSource(row: SourceListRow, sourceTagsList: TagSummary[]): Source {
  const { source, region, neighborhood } = row;

  return {
    id: source.id,
    slug: source.slug,
    name: source.name,
    shortDescription: source.shortDescription,
    category: source.category,
    providerName: source.providerName,
    providerKind: source.providerKind,
    sourcePageUrl: source.sourcePageUrl,
    embedUrl: source.embedUrl,
    mediaType: source.mediaType,
    permissionStatus: source.permissionStatus,
    availabilityStatus: source.availabilityStatus,
    statusNote: source.statusNote,
    scope: source.scope,
    city: source.city,
    state: source.state,
    latitude: source.latitude,
    longitude: source.longitude,
    locationPrecision: source.locationPrecision,
    addressHint: source.addressHint,
    licenseNotes: source.licenseNotes,
    termsUrl: source.termsUrl,
    attribution: source.attribution,
    lastCheckedAt: source.lastCheckedAt,
    lastStatusChangeAt: source.lastStatusChangeAt,
    isFeatured: source.isFeatured,
    isDemo: source.isDemo,
    provenanceDataset: source.provenanceDataset,
    provenanceRecordId: source.provenanceRecordId,
    importedAt: source.importedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    region: mapRegion(region),
    neighborhood: mapNeighborhood(neighborhood, region),
    tags: sourceTagsList,
  };
}

function buildFilters(query: CatalogQuery): SQL[] {
  const filters: SQL[] = [];

  for (const token of tokenizeSearch(query.q ?? "")) {
    filters.push(like(sources.searchText, `%${token}%`));
  }

  if (query.category) filters.push(eq(sources.category, query.category));
  if (query.region) filters.push(eq(regions.slug, query.region));
  if (query.neighborhood) {
    filters.push(eq(neighborhoods.slug, query.neighborhood));
  }
  if (query.permission) {
    filters.push(eq(sources.permissionStatus, query.permission));
  }
  if (query.availability) {
    filters.push(eq(sources.availabilityStatus, query.availability));
  }
  if (query.media) filters.push(eq(sources.mediaType, query.media));
  if (query.scope) filters.push(eq(sources.scope, query.scope));

  if (query.tag) {
    filters.push(
      sql`exists (
        select 1
        from ${sourceTags}
        inner join ${tags} on ${tags.id} = ${sourceTags.tagId}
        where ${sourceTags.sourceId} = ${sources.id}
          and ${tags.slug} = ${query.tag}
      )`,
    );
  }

  return filters;
}

function orderBy(sort: SortOption): SQL[] {
  switch (sort) {
    case "name":
      return [asc(sources.name), asc(sources.id)];
    case "updated":
      return [
        desc(sources.lastCheckedAt),
        desc(sources.updatedAt),
        asc(sources.name),
        asc(sources.id),
      ];
    case "region":
      return [
        asc(regions.sortOrder),
        asc(sources.name),
        asc(sources.id),
      ];
    case "relevance":
    default:
      return [
        desc(sources.isFeatured),
        asc(sources.name),
        asc(sources.id),
      ];
  }
}

async function loadTagsBySourceId(
  sourceIds: string[],
): Promise<Map<string, TagSummary[]>> {
  const result = new Map<string, TagSummary[]>();
  if (sourceIds.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      sourceId: sourceTags.sourceId,
      id: tags.id,
      slug: tags.slug,
      label: tags.label,
    })
    .from(sourceTags)
    .innerJoin(tags, eq(tags.id, sourceTags.tagId))
    .where(inArray(sourceTags.sourceId, sourceIds))
    .orderBy(asc(tags.label));

  for (const row of rows) {
    const list = result.get(row.sourceId) ?? [];
    list.push({ id: row.id, slug: row.slug, label: row.label });
    result.set(row.sourceId, list);
  }

  return result;
}

export async function listSourceSlugs(): Promise<Array<{ slug: string }>> {
  return db
    .select({ slug: sources.slug })
    .from(sources)
    .orderBy(asc(sources.name));
}

export async function listNews(options?: {
  region?: string;
  limit?: number;
}): Promise<NewsItem[]> {
  const rows = await db
    .select({
      news: newsItems,
      region: regions,
      neighborhood: neighborhoods,
    })
    .from(newsItems)
    .innerJoin(regions, eq(newsItems.regionId, regions.id))
    .leftJoin(neighborhoods, eq(newsItems.neighborhoodId, neighborhoods.id))
    .where(
      and(
        eq(newsItems.isActive, true),
        options?.region ? eq(regions.slug, options.region) : undefined,
      ),
    )
    .orderBy(
      desc(newsItems.publishedAt),
      desc(newsItems.fetchedAt),
      asc(newsItems.title),
    )
    .limit(options?.limit ?? 300);

  const classify = (title: string, kind: string): NewsTopic => {
    if (kind === "channel") return "channel";
    const text = normalizeText(title);
    if (/(acidente|colisao|atropel|capot|batida)/.test(text)) return "accident";
    if (/(interdicao|bloqueio|fechamento|operacao de transito|desvio)/.test(text))
      return "closure";
    if (/(chuva|alagamento|temporal|enchente|raio)/.test(text)) return "weather";
    if (/(evento|desfile|show|festa|corrida|maratona|bloco)/.test(text))
      return "event";
    return "news";
  };

  return rows.map((row) => ({
    id: row.news.id,
    regionId: row.news.regionId,
    regionSlug: row.region.slug,
    regionName: row.region.name,
    neighborhoodId: row.news.neighborhoodId,
    neighborhoodSlug: row.neighborhood?.slug ?? null,
    neighborhoodName: row.neighborhood?.name ?? null,
    kind: row.news.kind,
    topic: classify(row.news.title, row.news.kind),
    title: row.news.title,
    url: row.news.url,
    publisher: row.news.publisher,
    publishedAt: row.news.publishedAt,
    fetchedAt: row.news.fetchedAt,
  }));
}

export async function listSources(
  query: CatalogQuery,
): Promise<Paginated<Source>> {
  const filters = buildFilters(query);
  const where = filters.length > 0 ? and(...filters) : undefined;

  const countRows = await db
    .select({ value: count() })
    .from(sources)
    .leftJoin(regions, eq(sources.regionId, regions.id))
    .leftJoin(neighborhoods, eq(sources.neighborhoodId, neighborhoods.id))
    .where(where);

  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(query.page, 1), totalPages);

  const rows = await db
    .select({
      source: sources,
      region: regions,
      neighborhood: neighborhoods,
    })
    .from(sources)
    .leftJoin(regions, eq(sources.regionId, regions.id))
    .leftJoin(neighborhoods, eq(sources.neighborhoodId, neighborhoods.id))
    .where(where)
    .orderBy(...orderBy(query.sort))
    .limit(query.pageSize)
    .offset((page - 1) * query.pageSize);

  const tagMap = await loadTagsBySourceId(rows.map((row) => row.source.id));
  const items = rows.map((row) =>
    mapSource(row, tagMap.get(row.source.id) ?? []),
  );

  return {
    items,
    page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}

export async function getSourceBySlug(
  slug: string,
): Promise<SourceDetail | null> {
  const rows = await db
    .select({
      source: sources,
      region: regions,
      neighborhood: neighborhoods,
    })
    .from(sources)
    .leftJoin(regions, eq(sources.regionId, regions.id))
    .leftJoin(neighborhoods, eq(sources.neighborhoodId, neighborhoods.id))
    .where(eq(sources.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const tagMap = await loadTagsBySourceId([row.source.id]);
  const statusRows = await db
    .select({
      id: sourceStatusChecks.id,
      checkedAt: sourceStatusChecks.checkedAt,
      status: sourceStatusChecks.status,
      httpStatus: sourceStatusChecks.httpStatus,
      errorCode: sourceStatusChecks.errorCode,
      latencyMs: sourceStatusChecks.latencyMs,
      notes: sourceStatusChecks.notes,
    })
    .from(sourceStatusChecks)
    .where(eq(sourceStatusChecks.sourceId, row.source.id))
    .orderBy(desc(sourceStatusChecks.checkedAt))
    .limit(10);

  const statusChecks: StatusCheck[] = statusRows.map((check) => ({
    id: check.id,
    checkedAt: check.checkedAt,
    status: check.status,
    httpStatus: check.httpStatus,
    errorCode: check.errorCode,
    latencyMs: check.latencyMs,
    notes: check.notes,
  }));

  return {
    ...mapSource(row, tagMap.get(row.source.id) ?? []),
    statusChecks,
  };
}

export async function getNeighborhoodBySlug(
  slug: string,
): Promise<NeighborhoodSummary | null> {
  await ensureCameraSchema();
  const rows = await db
    .select({ neighborhood: neighborhoods, region: regions })
    .from(neighborhoods)
    .innerJoin(regions, eq(neighborhoods.regionId, regions.id))
    .where(eq(neighborhoods.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapNeighborhood(row.neighborhood, row.region);
}

export async function listNeighborhoods(options?: {
  region?: string;
  q?: string;
}): Promise<NeighborhoodWithCount[]> {
  await ensureCameraSchema();
  const regionFilter = options?.region
    ? eq(regions.slug, options.region)
    : undefined;

  const rows = await db
    .select({
      neighborhood: neighborhoods,
      region: regions,
      sourceCount: count(sources.id),
    })
    .from(neighborhoods)
    .innerJoin(regions, eq(neighborhoods.regionId, regions.id))
    .leftJoin(sources, eq(sources.neighborhoodId, neighborhoods.id))
    .where(regionFilter)
    .groupBy(neighborhoods.id, regions.id)
    .orderBy(asc(regions.sortOrder), asc(neighborhoods.name));

  const search = normalizeText(options?.q ?? "");

  return rows
    .map((row) => ({
      ...(mapNeighborhood(row.neighborhood, row.region) as NeighborhoodSummary),
      sourceCount: Number(row.sourceCount),
    }))
    .filter((row) => {
      if (!search) {
        return true;
      }
      return normalizeText(
        `${row.name} ${row.regionName} ${row.summary ?? ""}`,
      ).includes(search);
    });
}

export async function listCameras(options?: {
  region?: string;
  neighborhood?: string;
}): Promise<Camera[]> {
  await ensureCameraSchema();
  const filters: SQL[] = [];
  if (options?.region) {
    filters.push(eq(cameras.regionSlug, options.region));
  }
  if (options?.neighborhood) {
    filters.push(eq(cameras.neighborhoodSlug, options.neighborhood));
  }

  const rows = await db
    .select({
      camera: cameras,
      neighborhood: neighborhoods,
      region: regions,
      source: sources,
    })
    .from(cameras)
    .leftJoin(neighborhoods, eq(cameras.neighborhoodId, neighborhoods.id))
    .leftJoin(regions, eq(neighborhoods.regionId, regions.id))
    .leftJoin(sources, eq(cameras.sourceId, sources.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(cameras.externalId), asc(cameras.name));

  return rows.map((row) =>
    mapCamera(row.camera, row.neighborhood, row.region, row.source),
  );
}

export async function countCameras(): Promise<number> {
  const rows = await db.select({ value: count() }).from(cameras);
  return Number(rows[0]?.value ?? 0);
}

function mapCamera(
  camera: CameraRow,
  neighborhood: NeighborhoodRow | null,
  region: RegionRow | null,
  source: SourceRow | null = null,
): Camera {
  return {
    id: camera.id,
    externalId: camera.externalId,
    name: camera.name,
    latitude: camera.latitude,
    longitude: camera.longitude,
    pageUrl: camera.pageUrl,
    providerName: camera.providerName,
    neighborhoodSlug: neighborhood?.slug ?? camera.neighborhoodSlug,
    neighborhoodName: neighborhood?.name ?? null,
    regionSlug: region?.slug ?? camera.regionSlug,
    regionName: region?.name ?? null,
    sourceId: source?.id ?? camera.sourceId ?? null,
    sourceName: source?.name ?? null,
    sourcePageUrl: source?.sourcePageUrl ?? null,
    sourceAddressHint: source?.addressHint ?? null,
    lastCheckedAt: source?.lastCheckedAt ?? null,
    isOnline: camera.isOnline ?? null,
  };
}

function emptyCountRecord<T extends string>(
  values: readonly T[],
): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<
    T,
    number
  >;
}

export async function getCatalogStats(): Promise<CatalogStats> {
  // Consultas sequenciais: o pooler do Supabase e o cliente com max: 1 não
  // lidam bem com várias consultas disparadas em paralelo.
  const totalSourceRows = await db.select({ value: count() }).from(sources);
  const totalNeighborhoodRows = await db
    .select({ value: count() })
    .from(neighborhoods);
  const totalRegionRows = await db.select({ value: count() }).from(regions);
  const totalTagRows = await db.select({ value: count() }).from(tags);
  const totalCameraRows = await db.select({ value: count() }).from(cameras);
  const coordinateRows = await db
    .select({ value: count() })
    .from(sources)
    .where(and(isNotNull(sources.latitude), isNotNull(sources.longitude)));
  const featuredRows = await db
    .select({ value: count() })
    .from(sources)
    .where(eq(sources.isFeatured, true));
  const demoRows = await db
    .select({ value: count() })
    .from(sources)
    .where(eq(sources.isDemo, true));
  const availabilityRows = await db
    .select({ status: sources.availabilityStatus, value: count() })
    .from(sources)
    .groupBy(sources.availabilityStatus);
  const permissionRows = await db
    .select({ status: sources.permissionStatus, value: count() })
    .from(sources)
    .groupBy(sources.permissionStatus);
  const scopeRows = await db
    .select({ status: sources.scope, value: count() })
    .from(sources)
    .groupBy(sources.scope);
  const lastCheckedRows = await db
    .select({ value: max(sources.lastCheckedAt) })
    .from(sources);

  const byAvailability = emptyCountRecord(AVAILABILITY_STATUS_VALUES);
  for (const row of availabilityRows) {
    byAvailability[row.status as AvailabilityStatus] = Number(row.value);
  }

  const byPermission = emptyCountRecord(PERMISSION_STATUS_VALUES);
  for (const row of permissionRows) {
    byPermission[row.status as PermissionStatus] = Number(row.value);
  }

  const byScope = emptyCountRecord(SCOPE_VALUES);
  for (const row of scopeRows) {
    byScope[row.status as Scope] = Number(row.value);
  }

  return {
    totalSources: Number(totalSourceRows[0]?.value ?? 0),
    totalNeighborhoods: Number(totalNeighborhoodRows[0]?.value ?? 0),
    totalRegions: Number(totalRegionRows[0]?.value ?? 0),
    totalTags: Number(totalTagRows[0]?.value ?? 0),
    totalCameras: Number(totalCameraRows[0]?.value ?? 0),
    withCoordinates: Number(coordinateRows[0]?.value ?? 0),
    featured: Number(featuredRows[0]?.value ?? 0),
    demo: Number(demoRows[0]?.value ?? 0),
    byAvailability,
    byPermission,
    byScope,
    lastCheckedAt: lastCheckedRows[0]?.value ?? null,
  };
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  const stats = await getCatalogStats();
  const categoryRows = await db
    .select({ value: sources.category, count: count() })
    .from(sources)
    .groupBy(sources.category);
  const regionRows = await db
    .select({ region: regions, sourceCount: count(sources.id) })
    .from(regions)
    .leftJoin(sources, eq(sources.regionId, regions.id))
    .groupBy(regions.id)
    .orderBy(asc(regions.sortOrder));
  const tagRows = await db
    .select({
      tag: tags,
      sourceCount: count(sourceTags.sourceId),
    })
    .from(tags)
    .leftJoin(sourceTags, eq(sourceTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.label));
  const neighborhoodRows = await listNeighborhoods();

  const categoryCounts = new Map(
    categoryRows.map((row) => [row.value as Category, Number(row.count)]),
  );

  return {
    categories: CATEGORY_VALUES.map((value) => ({
      value,
      count: categoryCounts.get(value) ?? 0,
    })),
    regions: regionRows.map((row) => ({
      ...(mapRegion(row.region) as RegionSummary),
      sourceCount: Number(row.sourceCount),
    })),
    neighborhoods: neighborhoodRows,
    tags: tagRows.map((row) => ({
      id: row.tag.id,
      slug: row.tag.slug,
      label: row.tag.label,
      sourceCount: Number(row.sourceCount),
    })),
    stats,
  };
}

/**
 * Metadados do mapa (regiões e bairros) montados a partir dos dados estáticos
 * do seed. A lista de bairros é a mesma do banco, mas assim a página do mapa
 * abre mesmo se a consulta de bairros estiver lenta ou indisponível.
 */
export async function getMapMeta(): Promise<MapMeta> {
  const regionRows = REGION_VALUES.map((slug) => ({
    slug,
    name: REGION_META[slug].name,
  }));

  const neighborhoodRows: NeighborhoodWithCount[] = NEIGHBORHOOD_SEED.map(
    (neighborhood) => {
      const region = REGION_META[neighborhood.regionSlug as RegionSlug];

      return {
        id: `neighborhood_${neighborhood.slug}`,
        slug: neighborhood.slug,
        name: neighborhood.name,
        regionId: `region_${neighborhood.regionSlug}`,
        regionSlug: neighborhood.regionSlug,
        regionName: region?.name ?? neighborhood.regionSlug,
        latitude: neighborhood.latitude,
        longitude: neighborhood.longitude,
        locationPrecision: "approximate" as const,
        summary: neighborhood.summary,
        sourceCount: 0,
      };
    },
  ).sort((a, b) => {
    const orderA = REGION_META[a.regionSlug as RegionSlug]?.sortOrder ?? 999;
    const orderB = REGION_META[b.regionSlug as RegionSlug]?.sortOrder ?? 999;
    return orderA !== orderB
      ? orderA - orderB
      : a.name.localeCompare(b.name, "pt-BR");
  });

  return {
    regions: regionRows,
    neighborhoods: neighborhoodRows,
  };
}

export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
  sort: "relevance",
  page: 1,
  pageSize: CATALOG_PAGE_SIZE,
};
