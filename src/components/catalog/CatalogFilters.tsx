import Link from "next/link";
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  CATEGORY_META,
  PERMISSION_STATUS_META,
  PERMISSION_STATUS_VALUES,
  SORT_OPTIONS,
} from "@/lib/constants";
import { hasActiveCatalogFilters } from "@/lib/catalog-params";
import type { CatalogMeta, CatalogQuery } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

const FIELD_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.14em] text-muted";

export function CatalogFilters({
  query,
  meta,
}: {
  query: CatalogQuery;
  meta: CatalogMeta;
}) {
  const active = hasActiveCatalogFilters(query);
  const categoryCounts = new Map(
    meta.categories.map((category) => [category.value, category.count]),
  );

  return (
    <form
      action="/"
      method="get"
      aria-label="Filtrar o catálogo"
      className="min-w-0 rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(22,33,42,0.04)] lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <SlidersHorizontal aria-hidden className="size-4 text-brand" />
          Filtrar
        </h2>
        {active ? (
          <Link
            href="/"
            className="text-[11px] font-medium text-muted underline decoration-line underline-offset-4 transition-colors hover:text-brand"
          >
            Limpar
          </Link>
        ) : null}
      </div>

      <div className="relative mt-4">
        <label htmlFor="catalog-q" className="sr-only">
          Buscar no catálogo
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          id="catalog-q"
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          placeholder="Fonte, bairro ou tema"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-line bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted/70 focus:border-brand/40 focus:bg-card focus:outline-none"
        />
      </div>

      <fieldset className="mt-5">
        <legend className={FIELD_LABEL}>Categoria</legend>
        <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
          <label className="shrink-0 cursor-pointer">
            <input
              type="radio"
              name="category"
              value=""
              defaultChecked={!query.category}
              className="peer sr-only"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              Todas
              <span className="text-[10px] opacity-70">{meta.stats.totalSources}</span>
            </span>
          </label>

          {meta.categories.map((category) => (
            <label key={category.value} className="shrink-0 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={category.value}
                defaultChecked={query.category === category.value}
                className="peer sr-only"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                <CategoryIcon
                  category={category.value}
                  className="size-3.5"
                />
                {CATEGORY_META[category.value].label}
                <span className="text-[10px] opacity-70">
                  {categoryCounts.get(category.value) ?? 0}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-1">
        <div>
          <label htmlFor="filter-region" className={FIELD_LABEL}>
            Região
          </label>
          <div className="relative mt-1.5">
            <select
              id="filter-region"
              name="region"
              defaultValue={query.region ?? ""}
              className="h-10 w-full appearance-none rounded-lg border border-line bg-background px-3 pr-8 text-sm focus:border-brand/40 focus:outline-none"
            >
              <option value="">Todas as regiões</option>
              {meta.regions.map((region) => (
                <option key={region.slug} value={region.slug}>
                  {region.name} ({region.sourceCount})
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-permission" className={FIELD_LABEL}>
            Permissão
          </label>
          <div className="relative mt-1.5">
            <select
              id="filter-permission"
              name="permission"
              defaultValue={query.permission ?? ""}
              className="h-10 w-full appearance-none rounded-lg border border-line bg-background px-3 pr-8 text-sm focus:border-brand/40 focus:outline-none"
            >
              <option value="">Qualquer permissão</option>
              {PERMISSION_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {PERMISSION_STATUS_META[status].shortLabel} (
                  {meta.stats.byPermission[status] ?? 0})
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="filter-sort" className={FIELD_LABEL}>
            Ordenar por
          </label>
          <div className="relative mt-1.5">
            <select
              id="filter-sort"
              name="sort"
              defaultValue={query.sort}
              className="h-10 w-full appearance-none rounded-lg border border-line bg-background px-3 pr-8 text-sm focus:border-brand/40 focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="mt-5 h-11 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong"
      >
        Aplicar filtros
      </button>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        A busca e os filtros ficam na URL e podem ser compartilhados.
      </p>
    </form>
  );
}
