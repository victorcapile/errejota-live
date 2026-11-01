import { z } from "zod";
import {
  AVAILABILITY_STATUS_VALUES,
  CATALOG_PAGE_SIZE,
  CATEGORY_VALUES,
  MAX_PAGE_SIZE,
  MEDIA_TYPE_VALUES,
  PERMISSION_STATUS_VALUES,
  SCOPE_VALUES,
  SORT_VALUES,
  isAvailabilityStatus,
  isCategory,
  isMediaType,
  isPermissionStatus,
  isScope,
  isSortOption,
} from "./constants";
import type { CatalogQuery } from "./types";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const QUERY_MAX_LENGTH = 120;

function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readSlug(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return SLUG_PATTERN.test(normalized) ? normalized : undefined;
}

function readText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, QUERY_MAX_LENGTH);
}

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  max?: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return max ? Math.min(parsed, max) : parsed;
}

export function catalogQueryFromRecord(
  record: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const category = firstValue(record.category);
  const permission = firstValue(record.permission);
  const availability = firstValue(record.availability);
  const media = firstValue(record.media);
  const scope = firstValue(record.scope);
  const sort = firstValue(record.sort);

  return {
    q: readText(firstValue(record.q)),
    category: isCategory(category) ? category : undefined,
    region: readSlug(firstValue(record.region)),
    neighborhood: readSlug(firstValue(record.neighborhood)),
    permission: isPermissionStatus(permission) ? permission : undefined,
    availability: isAvailabilityStatus(availability) ? availability : undefined,
    media: isMediaType(media) ? media : undefined,
    tag: readSlug(firstValue(record.tag)),
    scope: isScope(scope) ? scope : undefined,
    sort: isSortOption(sort) ? sort : "relevance",
    page: readPositiveInt(firstValue(record.page), 1),
    pageSize: readPositiveInt(
      firstValue(record.pageSize),
      CATALOG_PAGE_SIZE,
      MAX_PAGE_SIZE,
    ),
  };
}

export function catalogQueryFromSearchParams(
  searchParams: URLSearchParams,
): CatalogQuery {
  return catalogQueryFromRecord(Object.fromEntries(searchParams.entries()));
}

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional());

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(QUERY_MAX_LENGTH).optional(),
);

const optionalSlug = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, "Use um slug válido.")
    .optional(),
);

const optionalPage = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).optional(),
);

const optionalPageSize = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
);

export const apiCatalogQuerySchema = z.object({
  q: optionalText,
  category: optionalEnum(CATEGORY_VALUES),
  region: optionalSlug,
  neighborhood: optionalSlug,
  permission: optionalEnum(PERMISSION_STATUS_VALUES),
  availability: optionalEnum(AVAILABILITY_STATUS_VALUES),
  media: optionalEnum(MEDIA_TYPE_VALUES),
  tag: optionalSlug,
  scope: optionalEnum(SCOPE_VALUES),
  sort: optionalEnum(SORT_VALUES),
  page: optionalPage,
  pageSize: optionalPageSize,
});

export type ApiCatalogQueryResult =
  | { success: true; data: CatalogQuery }
  | {
      success: false;
      issues: Array<{ path: string; message: string }>;
    };

export function parseApiCatalogQuery(
  searchParams: URLSearchParams,
): ApiCatalogQueryResult {
  const parsed = apiCatalogQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(raiz)",
        message: issue.message,
      })),
    };
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      sort: parsed.data.sort ?? "relevance",
      page: parsed.data.page ?? 1,
      pageSize: parsed.data.pageSize ?? CATALOG_PAGE_SIZE,
    },
  };
}

export function catalogSearchParams(
  query: Partial<CatalogQuery>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.region) params.set("region", query.region);
  if (query.neighborhood) params.set("neighborhood", query.neighborhood);
  if (query.permission) params.set("permission", query.permission);
  if (query.availability) params.set("availability", query.availability);
  if (query.media) params.set("media", query.media);
  if (query.tag) params.set("tag", query.tag);
  if (query.scope) params.set("scope", query.scope);
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== CATALOG_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }

  return params;
}

export function hasActiveCatalogFilters(query: Partial<CatalogQuery>): boolean {
  return Boolean(
    query.q ||
      query.category ||
      query.region ||
      query.neighborhood ||
      query.permission ||
      query.availability ||
      query.media ||
      query.tag ||
      query.scope,
  );
}

export function catalogHref(
  query: Partial<CatalogQuery>,
  base = "/",
): string {
  const params = catalogSearchParams(query).toString();
  return params ? `${base}?${params}` : base;
}
