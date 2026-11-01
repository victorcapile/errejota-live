"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Info,
  LocateFixed,
  MapPin,
  Search,
  X,
  Menu,
} from "lucide-react";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { SourceBadges } from "@/components/catalog/SourceBadges";
import {
  CATEGORY_VALUES,
  CATEGORY_META,
  REGION_VALUES,
  REGION_COLORS,
  type Category,
  type RegionSlug,
} from "@/lib/constants";
import {
  coordinatesLabel,
  formatDate,
  locationLabel,
  precisionLabel,
} from "@/lib/format";
import { normalizeText } from "@/lib/text";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Camera, CatalogMeta, Source } from "@/lib/types";

const MapCanvas = dynamic(
  () => import("./MapCanvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => <MapPlaceholder />,
  },
);

type Props = {
  meta: CatalogMeta;
};

function MapPlaceholder() {
  return (
    <div className="paper-grid grid size-full place-items-center bg-brand/5">
      <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-muted shadow-sm">
        <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
        Carregando mapa…
      </div>
    </div>
  );
}

function isRegionSlug(value: string | null): value is RegionSlug {
  return value !== null && (REGION_VALUES as readonly string[]).includes(value);
}

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORY_VALUES as readonly string[]).includes(value);
}

function hasCoordinates(source: Source): boolean {
  return source.latitude !== null && source.longitude !== null;
}

function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-card text-muted hover:border-brand/30 hover:text-brand"
      }`}
    >
      {children}
      {typeof count === "number" ? (
        <span className={active ? "text-white opacity-70" : "text-[10px] opacity-70"}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SourceRow({
  source,
  active,
  onSelect,
}: {
  source: Source;
  active: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(source.slug)}
      className={`group flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition-colors ${
        active ? "bg-brand/5" : "hover:bg-background/70"
      }`}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-background text-brand">
        <CategoryIcon category={source.category} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-snug text-foreground">
            {source.name}
          </span>
          <ChevronRight
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5"
          />
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted">
          {source.providerName} · {locationLabel(source)}
        </span>
        <span className="mt-1.5 block">
          <SourceBadges source={source} />
        </span>
      </span>
    </button>
  );
}

function SourceDetailPanel({
  source,
  onBack,
  backLabel,
}: {
  source: Source;
  onBack: () => void;
  backLabel: string;
}) {
  const coordinates = coordinatesLabel(source);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:bg-brand/5 hover:text-brand"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          {backLabel}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-brand">
          <CategoryIcon category={source.category} className="size-4" />
          {CATEGORY_META[source.category].label}
        </p>

        <h2 className="mt-2 text-xl font-semibold leading-tight tracking-tight">
          {source.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {source.shortDescription}
        </p>

        <div className="mt-3">
          <SourceBadges source={source} detailed />
        </div>

        <dl className="mt-5 space-y-2.5 rounded-xl border border-line bg-background/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[11px] text-muted">Provedor</dt>
            <dd className="text-right text-xs font-medium">
              {source.providerName}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[11px] text-muted">Região</dt>
            <dd className="text-right text-xs font-medium">
              {source.region?.name ?? "Não informada"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[11px] text-muted">Localização</dt>
            <dd className="text-right text-xs font-medium">
              {locationLabel(source)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[11px] text-muted">Precisão</dt>
            <dd className="text-right text-xs font-medium">
              {precisionLabel(source)}
            </dd>
          </div>
          {coordinatesLabel(source) ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[11px] text-muted">Coordenadas</dt>
              <dd className="text-right font-mono text-[11px]">
                {coordinatesLabel(source)}
              </dd>
            </div>
          ) : null}
        </dl>

        {source.statusNote ? (
          <p className="mt-3 rounded-xl border border-brand/15 bg-brand/5 p-3 text-[11px] leading-relaxed text-foreground/80">
            {source.statusNote}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <a
            href={source.sourcePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong">
            Abrir página oficial
            <ExternalLink aria-hidden className="size-4" />
          </a>
          <Link
            href={`/fontes/${source.slug}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand"
          >
            Ver ficha completa
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          O link abre a página do provedor em outra aba. O Sauron não carrega
          player, não grava imagens e não confirma transmissão ao vivo.
        </p>
      </div>
    </div>
  );
}

export function MapExplorer({
  meta,
}: Props) {
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const initialRegion = searchParams.get("region");
  const initialNeighborhood = searchParams.get("neighborhood");
  const initialCategory = searchParams.get("category");

  const [region, setRegion] = useState<RegionSlug | "">(
    isRegionSlug(initialRegion) ? initialRegion : "",
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    initialNeighborhood && meta.neighborhoods.some((n) => n.slug === initialNeighborhood)
      ? initialNeighborhood
      : "",
  );
  const [category, setCategory] = useState<Category | "">(
    isCategory(initialCategory) ? initialCategory : "",
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [showNeighborhoods, setShowNeighborhoods] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [camerasError, setCamerasError] = useState(false);
  const [searchBounds, setSearchBounds] = useState<{
    points: [number, number][];
    key: number;
  } | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (isRegionSlug(initialRegion)) {
      initial.add(initialRegion);
    }
    const neighborhoodRegion = meta.neighborhoods.find(
      (n) => n.slug === initialNeighborhood,
    )?.regionSlug;
    if (neighborhoodRegion) {
      initial.add(neighborhoodRegion);
    }
    return initial;
  });

  const allRegionsCollapsed = meta.regions.every(
    (item) => !expandedRegions.has(item.slug),
  );

  const selectedRegion = meta.regions.find(
    (candidate) => candidate.slug === region,
  );
  const selectedNeighborhood = meta.neighborhoods.find(
    (candidate) => candidate.slug === neighborhood,
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (category) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());

    const search = params.toString();
    window.history.replaceState(null, "", search ? `/?${search}` : "/");
  }, [region, neighborhood, category, query]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/cameras", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return (await response.json()) as { items?: Camera[] };
      })
      .then((payload) => {
        setCameras(payload.items ?? []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Falha ao carregar câmeras:", error);
        setCamerasError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCamerasLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const cameraSearchIndex = useMemo(
    () =>
      cameras.map((camera) => ({
        camera,
        haystack: normalizeText(
          [
            camera.name,
            camera.providerName,
            camera.neighborhoodName,
            camera.regionName,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      })),
    [cameras],
  );

  const filteredCameras = useMemo(() => {
    const tokens = normalizeText(query).split(" ").filter(Boolean);

    return cameraSearchIndex
      .filter(({ camera }) => {
        if (region && camera.regionSlug !== region) {
          return false;
        }
        if (neighborhood && camera.neighborhoodSlug !== neighborhood) {
          return false;
        }
        return true;
      })
      .filter(({ haystack }) =>
        tokens.every((token) => haystack.includes(token)),
      )
      .map(({ camera }) => camera);
  }, [cameraSearchIndex, region, neighborhood, query]);

  const camerasByNeighborhood = useMemo(() => {
    const map = new Map<string, number>();
    for (const camera of cameras) {
      if (camera.neighborhoodSlug) {
        map.set(
          camera.neighborhoodSlug,
          (map.get(camera.neighborhoodSlug) ?? 0) + 1,
        );
      }
    }
    return map;
  }, [cameras]);

  const camerasByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const camera of cameras) {
      if (camera.regionSlug) {
        map.set(camera.regionSlug, (map.get(camera.regionSlug) ?? 0) + 1);
      }
    }
    return map;
  }, [cameras]);

  const regionKey = region || "all";
  const focusPoint = selectedNeighborhood
    ? {
        latitude: selectedNeighborhood.latitude as number,
        longitude: selectedNeighborhood.longitude as number,
      }
    : null;
  const focusKey = neighborhood || region || "all";

  const backLabel = selectedNeighborhood
    ? `Voltar para ${selectedNeighborhood.name}`
    : selectedRegion
    ? `Voltar para ${selectedRegion.name}`
    : "Voltar para todas as fontes";

  function clearFilters() {
    setQuery("");
    setCategory("");
    setRegion("");
    setNeighborhood("");
  }

  function handleRegionChange(next: RegionSlug | "") {
    setRegion(next);
    setNeighborhood("");
    if (next) {
      setExpandedRegions((previous) => new Set(previous).add(next));
    }
  }

  function toggleRegion(slug: string) {
    setExpandedRegions((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function toggleAllRegions() {
    setExpandedRegions((previous) => {
      const anyExpanded = meta.regions.some((item) => previous.has(item.slug));
      return anyExpanded
        ? new Set<string>()
        : new Set(meta.regions.map((item) => item.slug));
    });
  }

  function handleNeighborhoodChange(next: string) {
    setNeighborhood(next);
    if (next) {
      const found = meta.neighborhoods.find((n) => n.slug === next);
      if (found) {
        setRegion(found.regionSlug as RegionSlug);
        setExpandedRegions((previous) =>
          new Set(previous).add(found.regionSlug),
        );
      }
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-line bg-background/50 py-3">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Explorar o mapa
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Selecione um bairro para ver as câmeras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-lg border border-line bg-card p-2 text-muted transition-colors hover:bg-brand/5 hover:text-brand lg:hidden"
            >
              <Menu aria-hidden className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row">
          <aside
            className="w-full lg:w-64 border-r border-line bg-card overflow-y-auto"
          >
            <div className="p-4">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      const points = filteredCameras.map(
                        (camera) => [camera.longitude, camera.latitude] as [number, number],
                      );
                      if (points.length > 0) {
                        setSearchBounds({ points, key: Date.now() });
                      }
                    }
                  }}
                  placeholder="Buscar câmera ou bairro…"
                  aria-label="Buscar câmeras no mapa"
                  className="w-full rounded-xl border border-line bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-brand/40"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-brand/5 hover:text-brand"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-3 border-b border-line/70 mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Filtros
              </h3>
              <div className="mt-3">
                <Chip
                  active={region === ""}
                  onClick={() => handleRegionChange("")}
                  count={cameras.length}
                >
                  Todas
                </Chip>
                {meta.regions.map((item) => (
                  <Chip
                    key={item.slug}
                    active={region === item.slug}
                    onClick={() => handleRegionChange(item.slug as RegionSlug)}
                    count={camerasByRegion.get(item.slug) ?? 0}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          REGION_COLORS[item.slug as keyof typeof REGION_COLORS] ?? "#57534e",
                      }}
                      aria-hidden
                    />
                    {item.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="p-3">
              <ShowNeighborhoodsToggle
                show={showNeighborhoods}
                onToggle={() => setShowNeighborhoods((v) => !v)}
              />
              <ShowCamerasToggle
                show={showCameras}
                onToggle={() => setShowCameras((v) => !v)}
              />
            </div>
          </aside>

          <main className="flex-1 lg:flex-1 relative overflow-hidden bg-background">
            <MapCanvas
              cameras={filteredCameras}
              onSelectNeighborhood={handleNeighborhoodChange}
              neighborhoods={meta.neighborhoods}
              showNeighborhoods={showNeighborhoods}
              showCameras={showCameras}
              regionKey={regionKey}
              focusPoint={focusPoint}
              focusKey={focusKey}
              fitBoundsRequest={searchBounds}
              theme={theme}
            />

            <div className="pointer-events-none pt-2">
              <div className="pointer-events-auto rounded-t-md border border-line bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <LocateFixed aria-hidden className="size-3.5 text-brand" />
                  {camerasLoading
                    ? "Carregando câmeras…"
                    : `${filteredCameras.length} ${
                        filteredCameras.length === 1 ? "câmera" : "câmeras"
                      } no mapa`}
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0">
              <div className="pointer-events-auto max-w-full mx-auto rounded-b-md border border-line bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => handleRegionChange("")}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      region === ""
                        ? "bg-brand text-white"
                        : "text-muted hover:bg-brand/5 hover:text-brand"`
                    }`}
                  >
                    Todas
                  </button>
                  {meta.regions.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => handleRegionChange(item.slug as RegionSlug)}
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        region === item.slug
                          ? "bg-brand text-white"
                          : "text-muted hover:bg-brand/5 hover:text-brand"`
                      }`}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background:
                            REGION_COLORS[item.slug as keyof typeof REGION_COLORS] ?? "#57534e",
                        }}
                        aria-hidden
                      />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Recolher painel" : "Abrir painel"}
              className="absolute top-3 right-3 rounded-full border border-line bg-card p-1.5 text-muted shadow-md transition-all duration-300 hover:scale-110 hover:bg-brand/5 hover:text-brand lg:-flex"
              style={{ right: sidebarOpen ? "32px" : "12px" }}
            >
              {sidebarOpen ? (
                <ChevronLeft aria-hidden className="size-4" />
              ) : (
                <ChevronRight aria-hidden className="size-4" />
              )}
            </button>
          </main>
        </div>
      </div>
    </div>
  );
}

function ShowNeighborhoodsToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!show)}
      className="w-full rounded-lg border border-line bg-background px-3 py-2 text-[10px] font-medium text-muted transition-colors hover:text-brand mb-2"
      aria-pressed={show}
    >
      {show ? "Ocultar bairros" : "Mostrar bairros"}
    </button>
  );
}

function ShowCamerasToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!show)}
      className="w-full rounded-lg border border-line bg-background px-3 py-2 text-[10px] font-medium text-muted transition-colors hover:text-brand mb-2"
      aria-pressed={show}
    >
      {show ? "Ocultar câmeras" : "Mostrar câmeras"}
    </button>
  );
}

function InfoIcon() {
  return (
    <Info
      aria-hidden
      className="mx-auto size-5 text-muted/70"
    />
  );
}