import type { SourceSeed } from "./seed-data/sources";
import { db } from "./index";
import { sourceStatusChecks, sources } from "./schema";
import { CATEGORY_META, REGION_META, REGION_VALUES } from "@/lib/constants";
import { buildSearchText } from "@/lib/text";
import { NEIGHBORHOOD_SEED } from "./seed-data/neighborhoods";

/** Mesmos carimbos usados pelo seed do catálogo. */
const SEED_TIMESTAMP = "2026-10-31T12:00:00.000Z";
const IMPORTED_AT = "2026-10-31";

/**
 * Insere ou atualiza uma lista de fontes do catálogo (e o status check
 * inicial). Usado pelo seed completo e pelos scripts de ingestão, que
 * precisam garantir a existência da fonte que referenciam.
 */
export async function seedSourceList(seedList: SourceSeed[]): Promise<void> {
  const regionNames = new Map(
    REGION_VALUES.map((slug) => [slug, REGION_META[slug].name]),
  );
  const neighborhoodNames = new Map(
    NEIGHBORHOOD_SEED.map((neighborhood) => [
      neighborhood.slug,
      neighborhood.name,
    ]),
  );

  for (const source of seedList) {
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
      ...source.tags.map((tag) => tag),
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
