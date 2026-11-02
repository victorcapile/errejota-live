import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, MapPin, MapPinned } from "lucide-react";
import { NeighborhoodSkeleton } from "@/components/catalog/CatalogSkeletons";
import { getCatalogMeta } from "@/lib/catalog";
import type { NeighborhoodWithCount, RegionSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Bairros",
  description:
    "Índice geográfico dos bairros do Rio de Janeiro presentes no catálogo Rio em Foco, com contagem de fontes públicas por região.",
};

const GEO_REGIONS = new Set([
  "centro",
  "zona-sul",
  "zona-norte",
  "zona-oeste",
  "ilhas",
]);

const BROAD_REGIONS = new Set(["cidade", "estado", "nacional"]);

export default function NeighborhoodsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          <MapPinned aria-hidden className="size-4 text-brand" />
          Índice geográfico
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Bairros do Rio de Janeiro
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Um recorte por região para navegar pelo catálogo. As contagens
          mostram apenas fontes já catalogadas — um bairro sem número ainda não
          tem cobertura editorial, não significa ausência de fontes na cidade.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 text-sm leading-relaxed text-foreground/80">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          Coordenadas de bairro são aproximadas e servem para orientação. Nesta
          fase, nenhuma fonte é exibida como pino de câmera ou transmissão ao
          vivo.
        </p>
      </div>

      <Suspense fallback={<NeighborhoodSkeleton />}>
        <NeighborhoodIndex />
      </Suspense>
    </div>
  );
}

async function NeighborhoodIndex() {
  const meta = await getCatalogMeta();

  const groups = meta.regions
    .filter((region) => GEO_REGIONS.has(region.slug))
    .map((region) => ({
      region,
      neighborhoods: meta.neighborhoods
        .filter((neighborhood) => neighborhood.regionSlug === region.slug)
        .slice()
        .sort(
          (a, b) =>
            b.sourceCount - a.sourceCount ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
    }))
    .filter((group) => group.neighborhoods.length > 0);

  const broadRegions = meta.regions.filter((region) =>
    BROAD_REGIONS.has(region.slug),
  );

  const withSources = meta.neighborhoods.filter(
    (neighborhood) => neighborhood.sourceCount > 0,
  ).length;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="font-medium text-foreground">
          {meta.stats.totalNeighborhoods} bairros no índice
        </span>
        <span aria-hidden>·</span>
        <span>{withSources} com fontes catalogadas</span>
        <span aria-hidden>·</span>
        <span>{meta.stats.totalSources} fontes no total</span>
      </div>

      <nav aria-label="Regiões" className="mt-5 flex flex-wrap gap-1.5">
        {groups.map(({ region, neighborhoods }) => {
          const count = neighborhoods.reduce(
            (total, neighborhood) => total + neighborhood.sourceCount,
            0,
          );

          return (
            <a
              key={region.slug}
              href={`#${region.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-brand/25 hover:text-brand"
            >
              {region.name}
              <span className="text-[10px] opacity-70">{count}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-10 space-y-10">
        {groups.map(({ region, neighborhoods }) => (
          <RegionSection
            key={region.slug}
            region={region}
            neighborhoods={neighborhoods}
          />
        ))}
      </div>

      <section
        aria-labelledby="cobertura-ampla"
        className="mt-14 border-t border-line pt-8"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Cobertura ampla
        </p>
        <h2
          id="cobertura-ampla"
          className="mt-1 text-2xl font-semibold tracking-tight"
        >
          Fontes sem ponto único
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Portais municipais, estaduais e nacionais cobrem a cidade inteira ou
          todo o território fluminense. Eles não geram pinos de bairro.
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {broadRegions.map((region) => (
            <li key={region.slug}>
              <Link
                href={`/?region=${region.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 transition-colors hover:border-brand/30"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand">
                  {region.name}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {region.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand">
                  {region.sourceCount}{" "}
                  {region.sourceCount === 1 ? "fonte" : "fontes"}
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function RegionSection({
  region,
  neighborhoods,
}: {
  region: RegionSummary;
  neighborhoods: NeighborhoodWithCount[];
}) {
  const totalSources = neighborhoods.reduce(
    (total, neighborhood) => total + neighborhood.sourceCount,
    0,
  );

  return (
    <section id={region.slug} aria-labelledby={`${region.slug}-heading`}>
      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id={`${region.slug}-heading`}
            className="text-lg font-semibold tracking-tight"
          >
            {region.name}
          </h2>
          <p className="mt-1 text-xs text-muted">{region.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <span className="text-muted">
            {totalSources} {totalSources === 1 ? "fonte" : "fontes"}
          </span>
          <Link
            href={`/?region=${region.slug}`}
            className="inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-brand-strong"
          >
            Ver região
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {neighborhoods.map((neighborhood) => (
          <li
            key={neighborhood.id}
            className="rounded-xl border border-line bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {neighborhood.name}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                  {neighborhood.summary}
                </p>
              </div>

              {neighborhood.sourceCount > 0 ? (
                <Link
                  href={`/?neighborhood=${neighborhood.slug}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/15 bg-brand/5 px-2 py-1 text-[10px] font-semibold text-brand transition-colors hover:bg-brand/10"
                  aria-label={`Ver ${neighborhood.sourceCount} fontes de ${neighborhood.name}`}
                >
                  {neighborhood.sourceCount}
                  <span className="font-medium">
                    {neighborhood.sourceCount === 1 ? "fonte" : "fontes"}
                  </span>
                  <ArrowRight aria-hidden className="size-3" />
                </Link>
              ) : (
                <span className="shrink-0 rounded-full border border-line bg-background px-2 py-1 text-[10px] text-muted">
                  sem fontes
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
