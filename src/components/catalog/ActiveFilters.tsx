import Link from "next/link";
import { X } from "lucide-react";
import {
  AVAILABILITY_STATUS_META,
  CATEGORY_META,
  MEDIA_TYPE_META,
  PERMISSION_STATUS_META,
  SCOPE_META,
} from "@/lib/constants";
import { catalogHref } from "@/lib/catalog-params";
import type { CatalogMeta, CatalogQuery } from "@/lib/types";

type FilterKey =
  | "q"
  | "category"
  | "region"
  | "neighborhood"
  | "permission"
  | "availability"
  | "media"
  | "tag"
  | "scope";

type ActiveFilter = {
  key: FilterKey;
  label: string;
};

function buildActiveFilters(
  query: CatalogQuery,
  meta: CatalogMeta,
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  if (query.q) {
    filters.push({ key: "q", label: `Busca: “${query.q}”` });
  }

  if (query.category) {
    filters.push({
      key: "category",
      label: CATEGORY_META[query.category].label,
    });
  }

  if (query.region) {
    const region = meta.regions.find((item) => item.slug === query.region);
    if (region) {
      filters.push({ key: "region", label: region.name });
    }
  }

  if (query.neighborhood) {
    const neighborhood = meta.neighborhoods.find(
      (item) => item.slug === query.neighborhood,
    );
    if (neighborhood) {
      filters.push({ key: "neighborhood", label: neighborhood.name });
    }
  }

  if (query.permission) {
    filters.push({
      key: "permission",
      label: PERMISSION_STATUS_META[query.permission].shortLabel,
    });
  }

  if (query.availability) {
    filters.push({
      key: "availability",
      label: AVAILABILITY_STATUS_META[query.availability].shortLabel,
    });
  }

  if (query.media) {
    filters.push({
      key: "media",
      label: MEDIA_TYPE_META[query.media].label,
    });
  }

  if (query.tag) {
    const tag = meta.tags.find((item) => item.slug === query.tag);
    filters.push({ key: "tag", label: tag ? `#${tag.label}` : `#${query.tag}` });
  }

  if (query.scope) {
    filters.push({
      key: "scope",
      label: SCOPE_META[query.scope].label,
    });
  }

  return filters;
}

export function ActiveFilters({
  query,
  meta,
}: {
  query: CatalogQuery;
  meta: CatalogMeta;
}) {
  const filters = buildActiveFilters(query, meta);

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        Filtros ativos
      </span>
      {filters.map((filter) => (
        <Link
          key={filter.key}
          href={catalogHref({ ...query, [filter.key]: undefined, page: 1 })}
          aria-label={`Remover filtro ${filter.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-brand/15 bg-brand/5 px-2.5 py-1 text-[11px] font-medium text-brand transition-colors hover:border-brand/30 hover:bg-brand/10"
        >
          {filter.label}
          <X aria-hidden className="size-3" />
        </Link>
      ))}
      <Link
        href="/"
        className="ml-1 text-[11px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-brand"
      >
        limpar tudo
      </Link>
    </div>
  );
}
