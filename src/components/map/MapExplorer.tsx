"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Building2,
  Camera as CameraIcon,
  ChevronLeft,
  CloudRain,
  LocateFixed,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { CameraDossierPanel } from "@/components/map/CameraDossierPanel";
import { trackUsage } from "@/lib/usage-client";
import { RainConditionCard } from "@/components/map/RainConditionCard";
import { PresenceBadge } from "@/components/presence/PresenceBadge";
import {
  REGION_VALUES,
  REGION_COLORS,
  type RegionSlug,
} from "@/lib/constants";
import { assessFloodRisk, type AssessedFloodRiskLevel } from "@/lib/flood-risk";
import { rainFreshness } from "@/lib/rain-labels";
import { normalizeText } from "@/lib/text";
import { useTheme } from "@/components/theme/ThemeProvider";
import type {
  Camera,
  MapMeta,
  NeighborhoodCondition,
  RainStationLatest,
} from "@/lib/types";

/** Rebusca chuva/condições enquanto a aba estiver visível. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Evita page_view duplicado no StrictMode e em remontagens do mapa.
let pageViewTracked = false;

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
  const initialCameraId = searchParams.get("camera") ?? "";

  const [region, setRegion] = useState<RegionSlug | "">(
    isRegionSlug(initialRegion) ? initialRegion : "",
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    initialNeighborhood && meta.neighborhoods.some((n) => n.slug === initialNeighborhood)
      ? initialNeighborhood
      : "",
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedCameraId, setSelectedCameraId] = useState(initialCameraId);
  const initialStatus = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isStatusFilter(initialStatus) ? initialStatus : "all",
  );
  const [showCameras, setShowCameras] = useState(true);
  const [showRain, setShowRain] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const [rainStations, setRainStations] = useState<RainStationLatest[]>([]);
  const [conditions, setConditions] = useState<NeighborhoodCondition[]>([]);
  const [conditionsStatus, setConditionsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [hoveredCamera, setHoveredCamera] = useState<Camera | null>(null);
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getDesktopBreakpointSnapshot,
    () => false,
  );
  const [sidebarOpenPreference, setSidebarOpenPreference] = useState<boolean | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const sidebarOpen = mounted
    ? (sidebarOpenPreference ?? isDesktop)
    : false;

  const [locateRequest, setLocateRequest] = useState(0);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [updatingCameraId, setUpdatingCameraId] = useState<string | null>(null);
  const [dismissedDossierNeighborhood, setDismissedDossierNeighborhood] =
    useState<string | null>(null);
  const [searchBounds, setSearchBounds] = useState<{
    points: [number, number][];
    key: number;
  } | null>(null);
  const [resetViewRequest, setResetViewRequest] = useState(0);
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
  const trackedNeighborhoodRef = useRef<string | null>(null);

  useEffect(() => {
    if (pageViewTracked) {
      return;
    }
    pageViewTracked = true;
    trackUsage({ type: "page_view", path: window.location.pathname });
  }, []);

  useEffect(() => {
    if (!dossierOpen || !neighborhood) {
      trackedNeighborhoodRef.current = null;
      return;
    }
    if (trackedNeighborhoodRef.current === neighborhood) {
      return;
    }
    trackedNeighborhoodRef.current = neighborhood;
    trackUsage({
      type: "neighborhood_view",
      neighborhoodSlug: neighborhood,
      path: window.location.pathname,
    });
  }, [dossierOpen, neighborhood]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (selectedCameraId) params.set("camera", selectedCameraId);

    const search = params.toString();
    window.history.replaceState(null, "", search ? `/?${search}` : "/");
  }, [region, neighborhood, query, statusFilter, selectedCameraId]);

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

  useEffect(() => {
    let controller = new AbortController();
    let hasLoaded = false;

    const load = () => {
      controller.abort();
      controller = new AbortController();
      const current = controller;

      fetch("/api/conditions?limit=500", {
        signal: current.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return (await response.json()) as {
            items?: NeighborhoodCondition[];
          };
        })
        .then((payload) => {
          if (current.signal.aborted) {
            return;
          }
          hasLoaded = true;
          setConditions(payload.items ?? []);
          setConditionsStatus("ready");
        })
        .catch(() => {
          if (!current.signal.aborted && !hasLoaded) {
            setConditionsStatus("error");
          }
        });
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    load();
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!showRain) {
      return;
    }
    let controller = new AbortController();

    const load = () => {
      controller.abort();
      controller = new AbortController();
      const current = controller;

      fetch("/api/rain?limit=200", {
        signal: current.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            return { items: [] as RainStationLatest[] };
          }
          return (await response.json()) as { items?: RainStationLatest[] };
        })
        .then((payload) => {
          if (!current.signal.aborted) {
            setRainStations(payload.items ?? []);
          }
        })
        .catch(() => {
          // Mantém a última leitura válida em caso de falha pontual.
        });
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    load();
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      controller.abort();
    };
  }, [showRain]);

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

  const focusPoint = useMemo(
    () =>
      selectedNeighborhood
        ? {
            latitude: selectedNeighborhood.latitude as number,
            longitude: selectedNeighborhood.longitude as number,
          }
        : null,
    [selectedNeighborhood],
  );
  const focusKey = neighborhood || region || "all";
  const focusedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );

  function handleRegionChange(next: RegionSlug | "") {
    setHoveredCamera(null);
    setSelectedCameraId("");
    setRegion(next);
    setNeighborhood("");
    setDismissedDossierNeighborhood(neighborhood || null);
  }

  function handleNeighborhoodChange(next: string) {
    setHoveredCamera(null);
    setSelectedCameraId("");
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

  function handleSearchSubmit() {
    const points = filteredCameras.map(
      (camera) => [camera.longitude, camera.latitude] as [number, number],
    );
    if (points.length > 0) {
      setSearchBounds({ points, key: Date.now() });
    }
  }

  async function handleCameraStatusChange(
    camera: Camera,
    status: "online" | "offline",
  ) {
    setUpdatingCameraId(camera.id);
    try {
      const body = JSON.stringify({ externalId: camera.externalId, status });

      const post = (token: string | null) =>
        fetch("/api/cameras/status/manual", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-status-token": token } : {}),
          },
          body,
        });

      let token: string | null = null;
      try {
        token = window.sessionStorage.getItem("errejota-status-token");
      } catch {
        token = null;
      }

      let response = await post(token);

      if (response.status === 403) {
        const informed = window.prompt(
          "Token de manutenção para alterar o status das câmeras:",
        );
        if (informed) {
          try {
            window.sessionStorage.setItem(
              "errejota-status-token",
              informed,
            );
          } catch {
            // Sem sessionStorage: usa o token apenas nesta requisição.
          }
          response = await post(informed);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        cameras?: Array<{ externalId: string; isOnline: boolean | null }>;
      };
      const updated = payload.cameras?.find(
        (item) => item.externalId === camera.externalId,
      );
      const isOnline = updated ? updated.isOnline : status === "online";

      setCameras((current) =>
        current.map((item) =>
          item.id === camera.id ? { ...item, isOnline } : item,
        ),
      );
    } catch (error) {
      console.error("Falha ao atualizar o status da câmera:", error);
      window.alert("Não foi possível atualizar o status desta câmera.");
    } finally {
      setUpdatingCameraId(null);
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

  const selectedCondition = useMemo(
    () =>
      conditions.find(
        (condition) => condition.neighborhoodSlug === neighborhood,
      ) ?? null,
    [conditions, neighborhood],
  );

  // O risco é contextual e local: cruza a chuva da estação mais próxima
  // com o ISMFI do bairro. Bairro seco não recebe selo nem preenchimento.
  const floodRisk = useMemo(
    () =>
      assessFloodRisk(
        selectedCondition?.rainMaxMm ?? null,
        selectedCondition?.riskClass ?? null,
      ),
    [selectedCondition],
  );

  const isRainingHere =
    floodRisk.rain !== "sem_chuva" &&
    !rainFreshness(selectedCondition?.rainReadingAt ?? null).stale;

  const riskOverlay = useMemo<{
    slug: string;
    level: AssessedFloodRiskLevel;
  } | null>(() => {
    if (!dossierOpen || !neighborhood || !isRainingHere) {
      return null;
    }
    if (floodRisk.level === "nao_avaliado") {
      return null;
    }
    return { slug: neighborhood, level: floodRisk.level };
  }, [dossierOpen, neighborhood, isRainingHere, floodRisk.level]);

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
            className={`absolute inset-y-0 left-0 z-40 flex w-[min(92vw,24rem)] flex-col overflow-hidden border-r border-line bg-card shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-y-4 lg:left-4 lg:w-[23rem] lg:rounded-2xl lg:border ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-[calc(100%+1rem)]"
            }`}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                title={theme === "dark" ? "Dia" : "Noite"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand"
              >
                {theme === "dark" ? (
                  <Sun aria-hidden className="size-3.5" />
                ) : (
                  <Moon aria-hidden className="size-3.5" />
                )}
                {theme === "dark" ? "Dia" : "Noite"}
              </button>
            </div>

            <div className="px-4 pb-4 pt-4">
              <div className="overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-br from-background to-card/80 shadow-sm transition-all focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
                <div className="flex items-center gap-2.5 px-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Search aria-hidden className="size-4" />
                  </span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    placeholder="Buscar câmera, bairro ou região…"
                    aria-label="Buscar câmeras no mapa"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Limpar busca"
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-brand/10 hover:text-brand"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  ) : (
                    <kbd
                      aria-hidden
                      className="hidden shrink-0 items-center rounded-md border border-line bg-card px-1.5 py-0.5 text-[9px] font-medium text-muted lg:inline-flex"
                    >
                      Enter
                    </kbd>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-4">

              <h4 className="mt-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                Situação
              </h4>
              <div className="mt-2 flex flex-nowrap items-center gap-1.5">
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

              <h4 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                Região
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
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
              <section className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line/70 pt-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Bairros
                  </h4>
                  <span className="text-[10px] tabular-nums text-muted">
                    {visibleNeighborhoods.length}
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
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

            <div className="px-3 pb-2 pt-2">
              <ShowToggle
                show={showRain}
                onToggle={setShowRain}
                icon={CloudRain}
                labelOn="Ocultar chuva"
                labelOff="Mostrar chuva"
              />
              <ShowToggle
                show={show3d}
                onToggle={setShow3d}
                icon={Building2}
                labelOn="Ocultar 3D"
                labelOff="Mostrar 3D"
              />
              <div className="hidden lg:block">
                <ShowToggle
                  show={showCameras}
                  onToggle={setShowCameras}
                  icon={CameraIcon}
                  labelOn="Ocultar câmeras"
                  labelOff="Mostrar câmeras"
                />
              </div>
            </div>
            </div>

            <div className="shrink-0 border-t border-line/70 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Desenvolvido por Victor Capilé ·{" "}
                <a
                  href="https://github.com/victorcapile/errejota-live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand hover:underline"
                >
                  GitHub
                </a>
              </p>
            </div>
          </aside>

          {sidebarOpen ? (
            <button
              type="button"
              onClick={() => setSidebarOpenPreference(false)}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="absolute left-[min(92vw,24rem)] top-1/2 z-50 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-muted shadow-lg transition-colors hover:bg-background hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:left-[24rem]"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
          ) : null}

          <main className="absolute inset-0 overflow-hidden bg-background">
            <MapCanvas
              cameras={filteredCameras}
              onSelectNeighborhood={handleNeighborhoodChange}
              showCameras={showCameras}
              rainOpacity={showRain ? (dossierOpen ? 0.5 : 1) : 0}
              rainStations={rainStations}
              show3d={show3d}
              highlightedCamera={hoveredCamera ?? focusedCamera}
              focusedCamera={focusedCamera}
              focusPoint={focusPoint}
              focusKey={focusKey}
              riskOverlay={riskOverlay}
              fitBoundsRequest={searchBounds}
              resetViewRequest={resetViewRequest}
              locateRequest={locateRequest}
              theme={theme}
            />

            <div className="absolute right-4 top-[calc(max(1rem,env(safe-area-inset-top))+44px)] z-10 lg:hidden">
              <PresenceBadge variant="floating" />
            </div>

            {dossierOpen && selectedCondition ? (
              <div className="absolute inset-x-3 bottom-[calc(min(max(38dvh,14rem),22rem)+0.75rem)] z-20 lg:hidden">
                <RainConditionCard condition={selectedCondition} />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setLocateRequest((request) => request + 1)}
              aria-label="Centralizar minha localização"
              title="Centralizar minha localização"
              className="absolute right-3 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-10 grid size-9 place-items-center rounded-xl border border-line bg-card text-brand shadow-lg transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:bottom-auto lg:right-[10px] lg:top-[calc(env(safe-area-inset-top)+131px)]"
            >
              <LocateFixed aria-hidden className="size-5" />
            </button>

            <div
              className={`pointer-events-none absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 max-w-[calc(100vw-2rem)] ${
                dossierOpen ? "lg:right-[25.5rem]" : "lg:right-[10px]"
              }`}
            >
              <div className="pointer-events-auto flex h-[32px] max-w-full items-center gap-3 rounded-xl border border-line bg-card/95 px-3 shadow-sm backdrop-blur">
                {camerasLoading ? (
                  <span className="text-[11px] font-medium text-muted">
                    Carregando…
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-foreground">
                      <span className="relative flex size-1.5" aria-hidden>
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-70" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-blue-500" />
                      </span>
                      <CameraIcon
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted"
                      />
                      {statusCounts.online} online
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-foreground opacity-30"
                      />
                      {statusCounts.offline} offline
                    </span>
                  </>
                )}
              </div>
            </div>

            {dossierNeighborhood ? (
              <CameraDossierPanel
                neighborhood={dossierNeighborhood}
                neighborhoodCameras={dossierCameras}
                open={dossierOpen}
                onClose={() => {
                  setHoveredCamera(null);
                  setNeighborhood("");
                  setRegion("");
                  setDismissedDossierNeighborhood(null);
                  setResetViewRequest((value) => value + 1);
                }}
                onStatusChange={handleCameraStatusChange}
                onHoverCamera={setHoveredCamera}
                condition={selectedCondition}
                conditionStatus={conditionsStatus}
                updatingCameraId={updatingCameraId}
                statusFilter={statusFilter}
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

function ShowToggle({
  show,
  onToggle,
  icon: Icon,
  labelOn,
  labelOff,
}: {
  show: boolean;
  onToggle: (value: boolean) => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!show)}
      aria-pressed={show}
      className="mb-2 flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-background px-3 py-2 text-[10px] font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand"
    >
      <span className="flex items-center gap-2">
        <Icon aria-hidden className="size-3.5" />
        {show ? labelOn : labelOff}
      </span>
      <span
        aria-hidden
        className={`size-2 rounded-full ${show ? "bg-brand" : "bg-line"}`}
      />
    </button>
  );
}
