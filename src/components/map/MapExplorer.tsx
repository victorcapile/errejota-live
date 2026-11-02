"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ChevronLeft,
  LocateFixed,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { CameraDossierPanel } from "@/components/map/CameraDossierPanel";
import {
  REGION_VALUES,
  REGION_COLORS,
  type RegionSlug,
} from "@/lib/constants";
import { normalizeText } from "@/lib/text";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { Camera, MapMeta } from "@/lib/types";

const MapCanvas = dynamic(
  () => import("./MapCanvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => <MapPlaceholder />,
  },
);

type Props = {
  meta: MapMeta;
};

type StatusFilter = "all" | "online" | "offline";

function isStatusFilter(value: string | null): value is StatusFilter {
  return value === "online" || value === "offline";
}

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

function subscribeToDesktopBreakpoint(onChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 1024px)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopBreakpointSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
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

export function MapExplorer({
  meta,
}: Props) {
  const searchParams = useSearchParams();
  const { theme, toggle } = useTheme();

  const initialRegion = searchParams.get("region");
  const initialNeighborhood = searchParams.get("neighborhood");

  const [region, setRegion] = useState<RegionSlug | "">(
    isRegionSlug(initialRegion) ? initialRegion : "",
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    initialNeighborhood && meta.neighborhoods.some((n) => n.slug === initialNeighborhood)
      ? initialNeighborhood
      : "",
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialStatus = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isStatusFilter(initialStatus) ? initialStatus : "all",
  );
  const [showNeighborhoods, setShowNeighborhoods] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getDesktopBreakpointSnapshot,
    () => false,
  );
  const [sidebarOpenPreference, setSidebarOpenPreference] = useState<boolean | null>(null);
  const sidebarOpen = sidebarOpenPreference ?? isDesktop;
  const [locateRequest, setLocateRequest] = useState(0);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [dismissedDossierNeighborhood, setDismissedDossierNeighborhood] =
    useState<string | null>(null);
  const [searchBounds, setSearchBounds] = useState<{
    points: [number, number][];
    key: number;
  } | null>(null);
  const selectedNeighborhood = meta.neighborhoods.find(
    (candidate) => candidate.slug === neighborhood,
  );
  const dossierNeighborhood =
    selectedNeighborhood ??
    meta.neighborhoods.find(
      (item) => item.slug === dismissedDossierNeighborhood,
    ) ??
    null;
  const dossierOpen = Boolean(
    selectedNeighborhood && dismissedDossierNeighborhood !== neighborhood,
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);

    const search = params.toString();
    window.history.replaceState(null, "", search ? `/?${search}` : "/");
  }, [region, neighborhood, query, statusFilter]);

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
            camera.externalId,
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

  // Câmeras que passam pelos filtros de região, bairro e busca.
  const scopedCameras = useMemo(() => {
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

  const statusCounts = useMemo(() => {
    let online = 0;
    let offline = 0;
    for (const camera of scopedCameras) {
      if (camera.isOnline === true) online += 1;
      else if (camera.isOnline === false) offline += 1;
    }
    return {
      all: scopedCameras.length,
      online,
      offline,
      unknown: scopedCameras.length - online - offline,
    };
  }, [scopedCameras]);

  const filteredCameras = useMemo(() => {
    if (statusFilter === "all") {
      return scopedCameras;
    }
    return scopedCameras.filter((camera) =>
      statusFilter === "online"
        ? camera.isOnline === true
        : camera.isOnline === false,
    );
  }, [scopedCameras, statusFilter]);

  const offlineCount = useMemo(
    () => filteredCameras.filter((camera) => camera.isOnline === false).length,
    [filteredCameras],
  );
  const onlineCount = useMemo(
    () => filteredCameras.filter((camera) => camera.isOnline === true).length,
    [filteredCameras],
  );
  const unknownCount =
    filteredCameras.length - onlineCount - offlineCount;

  // Base dos contadores geográficos: respeita o filtro de situação para que os
  // números de região/bairro batam com o que aparece no mapa.
  const statusFilteredCameras = useMemo(() => {
    if (statusFilter === "all") return cameras;
    return cameras.filter((camera) =>
      statusFilter === "online"
        ? camera.isOnline === true
        : camera.isOnline === false,
    );
  }, [cameras, statusFilter]);

  const camerasByNeighborhood = useMemo(() => {
    const map = new Map<string, number>();
    for (const camera of statusFilteredCameras) {
      if (camera.neighborhoodSlug) {
        map.set(
          camera.neighborhoodSlug,
          (map.get(camera.neighborhoodSlug) ?? 0) + 1,
        );
      }
    }
    return map;
  }, [statusFilteredCameras]);

  const camerasByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const camera of statusFilteredCameras) {
      if (camera.regionSlug) {
        map.set(camera.regionSlug, (map.get(camera.regionSlug) ?? 0) + 1);
      }
    }
    return map;
  }, [statusFilteredCameras]);

  const regionsWithCameras = meta.regions.filter(
    (item) => (camerasByRegion.get(item.slug) ?? 0) > 0,
  );

  const visibleNeighborhoods = meta.neighborhoods.filter(
    (item) => !region || item.regionSlug === region,
  );

  const focusPoint = selectedNeighborhood
    ? {
        latitude: selectedNeighborhood.latitude as number,
        longitude: selectedNeighborhood.longitude as number,
      }
    : null;
  const focusKey = neighborhood || region || "all";

  function handleRegionChange(next: RegionSlug | "") {
    setRegion(next);
    setNeighborhood("");
    setDismissedDossierNeighborhood(neighborhood || null);
  }

  function handleNeighborhoodChange(next: string) {
    setNeighborhood(next);
    setDismissedDossierNeighborhood(next ? null : neighborhood || null);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setSidebarOpenPreference(false);
    }
    if (next) {
      const found = meta.neighborhoods.find((n) => n.slug === next);
      if (found) {
        setRegion(found.regionSlug as RegionSlug);
      }
    }
  }

  const dossierCameras = useMemo(() => {
    if (!dossierNeighborhood) return [];
    return cameras
      .filter((camera) => camera.neighborhoodSlug === dossierNeighborhood.slug)
      .filter((camera) => {
        if (statusFilter === "online") return camera.isOnline === true;
        if (statusFilter === "offline") return camera.isOnline === false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [cameras, dossierNeighborhood, statusFilter]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-background lg:relative lg:inset-auto lg:z-auto lg:h-[calc(100dvh-4rem)]">
      <div className="relative h-full w-full overflow-hidden">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpenPreference(false)}
            className="absolute inset-0 z-30 bg-black/35 backdrop-blur-[1px] lg:hidden"
          />
        ) : null}
          <aside
            aria-label="Filtros e bairros"
            aria-hidden={!sidebarOpen}
            inert={!sidebarOpen}
            className={`absolute inset-y-0 left-0 z-40 flex w-[min(92vw,24rem)] flex-col overflow-y-auto border-r border-line bg-card shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-y-4 lg:left-4 lg:w-80 lg:rounded-2xl lg:border ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-[calc(100%+1rem)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-3 lg:hidden">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Filtros
              </span>
              <button
                type="button"
                onClick={toggle}
                aria-label={
                  theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"
                }
                title={theme === "dark" ? "Modo claro" : "Modo noturno"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand"
              >
                {theme === "dark" ? (
                  <Sun aria-hidden className="size-3.5" />
                ) : (
                  <Moon aria-hidden className="size-3.5" />
                )}
                {theme === "dark" ? "Modo claro" : "Modo noturno"}
              </button>
            </div>

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
                  placeholder="Buscar…"
                  aria-label="Buscar câmeras no mapa"
                  className="w-full rounded-xl border border-line bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-brand/80"
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

              <h4 className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                Situação
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                  count={statusCounts.all}
                >
                  Todas
                </Chip>
                <Chip
                  active={statusFilter === "online"}
                  onClick={() => setStatusFilter("online")}
                  count={statusCounts.online}
                >
                  <span
                    className="size-2 shrink-0 rounded-full bg-brand"
                    aria-hidden
                  />
                  Online
                </Chip>
                <Chip
                  active={statusFilter === "offline"}
                  onClick={() => setStatusFilter("offline")}
                  count={statusCounts.offline}
                >
                  <span
                    className="size-2 shrink-0 rounded-full bg-foreground opacity-30"
                    aria-hidden
                  />
                  Offline
                </Chip>
              </div>
              {statusCounts.unknown > 0 ? (
                <p className="mt-2 text-[10px] leading-snug text-muted/80">
                  {statusCounts.unknown}{" "}
                  {statusCounts.unknown === 1
                    ? "câmera ainda sem classificação"
                    : "câmeras ainda sem classificação"}
                  .
                </p>
              ) : null}

              <h4 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                Região
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip
                  active={region === ""}
                  onClick={() => handleRegionChange("")}
                  count={statusFilteredCameras.length}
                >
                  Todas
                </Chip>
                {regionsWithCameras.map((item) => (
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
              <section className="mt-5 border-t border-line/70 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Bairros
                  </h4>
                  <span className="text-[10px] tabular-nums text-muted">
                    {visibleNeighborhoods.length}
                  </span>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => handleNeighborhoodChange("")}
                    aria-pressed={!neighborhood}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      !neighborhood
                        ? "bg-brand/10 font-semibold text-brand"
                        : "text-foreground hover:bg-background"
                    }`}
                  >
                    <span>Todos os bairros</span>
                  </button>
                  {visibleNeighborhoods.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => handleNeighborhoodChange(item.slug)}
                      aria-pressed={neighborhood === item.slug}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        neighborhood === item.slug
                          ? "bg-brand/10 font-semibold text-brand"
                          : "text-foreground hover:bg-background"
                      }`}
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted">
                        {camerasByNeighborhood.get(item.slug) ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
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

          {sidebarOpen ? (
            <button
              type="button"
              onClick={() => setSidebarOpenPreference(false)}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="absolute left-[min(92vw,24rem)] top-1/2 z-50 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-muted shadow-lg transition-colors hover:bg-background hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:left-[21rem]"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
          ) : null}

          <main className="absolute inset-0 overflow-hidden bg-background">
            <MapCanvas
              cameras={filteredCameras}
              onSelectNeighborhood={handleNeighborhoodChange}
              showNeighborhoods={showNeighborhoods}
              showCameras={showCameras}
              focusPoint={focusPoint}
              focusKey={focusKey}
              fitBoundsRequest={searchBounds}
              locateRequest={locateRequest}
              theme={theme}
            />

            <button
              type="button"
              onClick={() => setLocateRequest((request) => request + 1)}
              aria-label="Centralizar minha localização"
              title="Centralizar minha localização"
              className="absolute right-[10px] top-[calc(env(safe-area-inset-top)+8rem)] z-10 grid size-9 place-items-center rounded-xl border border-line bg-card text-brand shadow-lg transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <LocateFixed aria-hidden className="size-5" />
            </button>

            <div
              className={`pointer-events-none absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 max-w-[calc(100vw-2rem)] ${
                dossierOpen ? "lg:right-[23.5rem]" : ""
              }`}
            >
              <div className="pointer-events-auto max-w-full rounded-xl border border-line bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <LocateFixed aria-hidden className="size-3.5 shrink-0 text-brand" />
                  <span>
                    {camerasLoading
                      ? "Carregando câmeras…"
                      : `${filteredCameras.length} ${
                          filteredCameras.length === 1 ? "câmera" : "câmeras"
                        } no mapa`}
                  </span>
                </p>
                {!camerasLoading && (offlineCount > 0 || onlineCount > 0) ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-brand"
                    />
                    {onlineCount} online
                    {offlineCount > 0 ? (
                      <>
                        <span aria-hidden className="text-line">
                          ·
                        </span>
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-foreground opacity-30"
                        />
                        {offlineCount} offline
                      </>
                    ) : null}
                    {unknownCount > 0 ? (
                      <>
                        <span aria-hidden className="text-line">
                          ·
                        </span>
                        {unknownCount} sem status
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>

            {dossierNeighborhood ? (
              <CameraDossierPanel
                neighborhood={dossierNeighborhood}
                neighborhoodCameras={dossierCameras}
                open={dossierOpen}
                onClose={() => setDismissedDossierNeighborhood(neighborhood || null)}
              />
            ) : null}

            {!sidebarOpen ? <button
              type="button"
              onClick={() => setSidebarOpenPreference(true)}
              aria-label="Abrir menu de filtros e bairros"
              title="Abrir menu de filtros e bairros"
              className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-40 grid size-11 place-items-center rounded-xl border border-line bg-card text-foreground shadow-lg transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Menu aria-hidden className="size-5" />
            </button> : null}
          </main>
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
