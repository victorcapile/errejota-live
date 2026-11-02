import { inArray } from "drizzle-orm";
import { db } from "./index";
import {
  neighborhoods,
  newsItems,
  regions,
  sourceStatusChecks,
  sources,
  sourceTags,
  tags,
} from "./schema";
import { NEIGHBORHOOD_SEED } from "./seed-data/neighborhoods";
import { CURATED_NEWS } from "./seed-data/news-curated";
import { SOURCE_SEED } from "./seed-data/sources";
import {
  CATEGORY_META,
  REGION_META,
  REGION_VALUES,
  TAG_LABELS,
} from "@/lib/constants";
import { buildSearchText } from "@/lib/text";

const SEED_TIMESTAMP = "2026-10-31T12:00:00.000Z";
const IMPORTED_AT = "2026-10-31";

async function seedRegions() {
  for (const slug of REGION_VALUES) {
    const meta = REGION_META[slug];
    await db
      .insert(regions)
      .values({
        id: `region_${slug}`,
        slug,
        name: meta.name,
        description: meta.description,
        sortOrder: meta.sortOrder,
      })
      .onConflictDoUpdate({
        target: regions.id,
        set: {
          slug,
          name: meta.name,
          description: meta.description,
          sortOrder: meta.sortOrder,
        },
      });
  }
}

async function seedNeighborhoods() {
  for (const neighborhood of NEIGHBORHOOD_SEED) {
    await db
      .insert(neighborhoods)
      .values({
        id: `neighborhood_${neighborhood.slug}`,
        slug: neighborhood.slug,
        name: neighborhood.name,
        regionId: `region_${neighborhood.regionSlug}`,
        city: "Rio de Janeiro",
        state: "RJ",
        latitude: neighborhood.latitude,
        longitude: neighborhood.longitude,
        locationPrecision: "approximate",
        summary: neighborhood.summary,
        createdAt: SEED_TIMESTAMP,
      })
      .onConflictDoUpdate({
        target: neighborhoods.id,
        set: {
          slug: neighborhood.slug,
          name: neighborhood.name,
          regionId: `region_${neighborhood.regionSlug}`,
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          locationPrecision: "approximate",
          summary: neighborhood.summary,
        },
      });
  }
}

async function seedTags() {
  const slugs = Array.from(
    new Set(SOURCE_SEED.flatMap((source) => source.tags)),
  ).sort();

  for (const slug of slugs) {
    await db
      .insert(tags)
      .values({
        id: `tag_${slug}`,
        slug,
        label: TAG_LABELS[slug] ?? slug,
      })
      .onConflictDoUpdate({
        target: tags.id,
        set: {
          slug,
          label: TAG_LABELS[slug] ?? slug,
        },
      });
  }

  return slugs;
}

async function seedSources() {
  const regionNames = new Map(
    REGION_VALUES.map((slug) => [slug, REGION_META[slug].name]),
  );
  const neighborhoodNames = new Map(
    NEIGHBORHOOD_SEED.map((neighborhood) => [
      neighborhood.slug,
      neighborhood.name,
    ]),
  );

  for (const source of SOURCE_SEED) {
    const sourceId = `source_${source.slug}`;
    const neighborhoodName = source.neighborhoodSlug
      ? neighborhoodNames.get(source.neighborhoodSlug)
      : null;
    const searchText = buildSearchText([
      source.name,
      source.shortDescription,
      source.providerName,
      CATEGORY_META[source.category].label,
      regionNames.get(source.regionSlug),
      neighborhoodName,
      source.addressHint,
      ...source.tags.map((tag) => TAG_LABELS[tag] ?? tag),
    ]);

    await db
      .insert(sources)
      .values({
        id: sourceId,
        slug: source.slug,
        name: source.name,
        shortDescription: source.shortDescription,
        searchText,
        category: source.category,
        providerName: source.providerName,
        providerKind: source.providerKind,
        sourcePageUrl: source.sourcePageUrl,
        embedUrl: null,
        mediaType: source.mediaType,
        permissionStatus: source.permissionStatus,
        availabilityStatus: source.availabilityStatus,
        statusNote: source.statusNote,
        scope: source.scope,
        city: source.city ?? null,
        state: source.state ?? null,
        regionId: `region_${source.regionSlug}`,
        neighborhoodId: source.neighborhoodSlug
          ? `neighborhood_${source.neighborhoodSlug}`
          : null,
        latitude: source.latitude ?? null,
        longitude: source.longitude ?? null,
        locationPrecision: source.locationPrecision,
        addressHint: source.addressHint ?? null,
        licenseNotes: source.licenseNotes,
        termsUrl: source.termsUrl ?? null,
        attribution: source.attribution,
        lastCheckedAt: source.lastCheckedAt,
        lastStatusChangeAt: source.lastCheckedAt,
        isFeatured: source.isFeatured ?? false,
        isDemo: false,
        provenanceDataset: "docs/FONTES.md",
        provenanceRecordId: source.slug,
        importedAt: IMPORTED_AT,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          slug: source.slug,
          name: source.name,
          shortDescription: source.shortDescription,
          searchText,
          category: source.category,
          providerName: source.providerName,
          providerKind: source.providerKind,
          sourcePageUrl: source.sourcePageUrl,
          embedUrl: null,
          mediaType: source.mediaType,
          permissionStatus: source.permissionStatus,
          availabilityStatus: source.availabilityStatus,
          statusNote: source.statusNote,
          scope: source.scope,
          city: source.city ?? null,
          state: source.state ?? null,
          regionId: `region_${source.regionSlug}`,
          neighborhoodId: source.neighborhoodSlug
            ? `neighborhood_${source.neighborhoodSlug}`
            : null,
          latitude: source.latitude ?? null,
          longitude: source.longitude ?? null,
          locationPrecision: source.locationPrecision,
          addressHint: source.addressHint ?? null,
          licenseNotes: source.licenseNotes,
          termsUrl: source.termsUrl ?? null,
          attribution: source.attribution,
          lastCheckedAt: source.lastCheckedAt,
          lastStatusChangeAt: source.lastCheckedAt,
          isFeatured: source.isFeatured ?? false,
          isDemo: false,
          provenanceDataset: "docs/FONTES.md",
          provenanceRecordId: source.slug,
          importedAt: IMPORTED_AT,
          updatedAt: SEED_TIMESTAMP,
        },
      });

    await db
      .insert(sourceStatusChecks)
      .values({
        id: `check_${source.slug}_2026-10-31`,
        sourceId,
        checkedAt: source.lastCheckedAt,
        status: source.availabilityStatus,
        httpStatus: source.httpStatus ?? null,
        errorCode: null,
        latencyMs: null,
        notes: source.statusNote,
      })
      .onConflictDoUpdate({
        target: sourceStatusChecks.id,
        set: {
          status: source.availabilityStatus,
          httpStatus: source.httpStatus ?? null,
          notes: source.statusNote,
        },
      });
  }
}

async function seedSourceTags(tagSlugs: string[]) {
  const knownTags = new Set(tagSlugs);
  const sourceIds = SOURCE_SEED.map((source) => `source_${source.slug}`);

  await db.delete(sourceTags).where(inArray(sourceTags.sourceId, sourceIds));

  for (const source of SOURCE_SEED) {
    const uniqueTags = Array.from(new Set(source.tags)).filter((tag) =>
      knownTags.has(tag),
    );

    if (uniqueTags.length === 0) {
      continue;
    }

    await db.insert(sourceTags).values(
      uniqueTags.map((tag) => ({
        sourceId: `source_${source.slug}`,
        tagId: `tag_${tag}`,
      })),
    );
  }
}

async function seedNews() {
  for (const item of CURATED_NEWS) {
    await db
      .insert(newsItems)
      .values({
        id: item.id,
        regionId: `region_${item.regionSlug}`,
        kind: "channel",
        title: item.title,
        url: item.url,
        publisher: item.publisher,
        feedId: null,
        publishedAt: null,
        fetchedAt: SEED_TIMESTAMP,
        isActive: true,
        createdAt: SEED_TIMESTAMP,
      })
      .onConflictDoUpdate({
        target: newsItems.id,
        set: {
          regionId: `region_${item.regionSlug}`,
          kind: "channel",
          title: item.title,
          url: item.url,
          publisher: item.publisher,
          isActive: true,
        },
      });
  }
}

async function main() {
  console.log("Rio em Foco — preparando catálogo...");

  await seedRegions();
  await seedNeighborhoods();
  const tagSlugs = await seedTags();
  await seedSources();
  await seedSourceTags(tagSlugs);
  await seedNews();

  const seededSources = await db
    .select({ id: sources.id })
    .from(sources)
    .where(inArray(sources.id, SOURCE_SEED.map((s) => `source_${s.slug}`)));

  console.log(
    `Seed concluído: ${REGION_VALUES.length} regiões, ${NEIGHBORHOOD_SEED.length} bairros, ${tagSlugs.length} tags, ${seededSources.length} fontes.`,
  );
}

main().catch((error) => {
  console.error("Falha no seed do catálogo:", error);
  process.exit(1);
});
