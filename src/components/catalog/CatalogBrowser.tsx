import { getCatalogMeta, listSources } from "@/lib/catalog";
import {
  catalogQueryFromRecord,
  hasActiveCatalogFilters,
} from "@/lib/catalog-params";
import { SORT_OPTIONS } from "@/lib/constants";
import { ActiveFilters } from "./ActiveFilters";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogResults } from "./CatalogResults";
import { Pagination } from "./Pagination";

export async function CatalogBrowser({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = catalogQueryFromRecord(params);

  const [result, meta] = await Promise.all([
    listSources(query),
    getCatalogMeta(),
  ]);

  const isFiltered = hasActiveCatalogFilters(query);
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === query.sort)?.label ??
    "Relevância";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
      <CatalogFilters query={query} meta={meta} />

      <div className="min-w-0">
        <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Resultado
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {result.total} {result.total === 1 ? "fonte" : "fontes"}
              {isFiltered ? (
                <span className="text-base font-normal text-muted">
                  {" "}
                  de {meta.stats.totalSources}
                </span>
              ) : null}
            </h2>
          </div>
          <p className="text-xs text-muted">
            Página {result.page} de {result.totalPages} · {sortLabel}
          </p>
        </div>

        <ActiveFilters query={query} meta={meta} />
        <CatalogResults result={result} />
        <Pagination
          query={query}
          page={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </div>
  );
}
