import { inArray } from "drizzle-orm";
import { db } from "./index";
import {
  neighborhoods,
  newsItems,
  regions,
  sources,
  sourceTags,
  tags,
} from "./schema";
import { NEIGHBORHOOD_SEED } from "./seed-data/neighborhoods";
import { CURATED_NEWS } from "./seed-data/news-curated";
import { SOURCE_SEED } from "./seed-data/sources";
import { REGION_META, REGION_VALUES, TAG_LABELS } from "@/lib/constants";
import { seedSourceList } from "./seed-sources";

const SEED_TIMESTAMP = "2026-10-31T12:00:00.000Z";

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
  console.log("Errejota — preparando catálogo...");

  await seedRegions();
  await seedNeighborhoods();
  const tagSlugs = await seedTags();
  await seedSourceList(SOURCE_SEED);
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
