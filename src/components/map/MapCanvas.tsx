"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

import { REGION_COLORS } from "@/lib/constants";
import type { Camera } from "@/lib/types";

// Centro inicial sem GPS: Tijuca no mobile e Freguesia (Jacarepaguá) no desktop.
const MOBILE_CENTER: [number, number] = [-43.236379, -22.938758];
const DESKTOP_CENTER: [number, number] = [-43.342118, -22.934761];

function initialMapCenter(): [number, number] {
  if (typeof window === "undefined") {
    return DESKTOP_CENTER;
  }
  return window.matchMedia("(min-width: 1024px)").matches
    ? DESKTOP_CENTER
    : MOBILE_CENTER;
}

const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const CAMERA_SOURCE_PREFIX = "cameras-";
const HIGHLIGHT_SOURCE = "camera-highlight";
const HIGHLIGHT_HALO_LAYER = "camera-highlight-halo";
const HIGHLIGHT_DOT_LAYER = "camera-highlight-dot";

function ensureHighlightLayers(map: MapLibreMap): void {
  if (!map.getSource(HIGHLIGHT_SOURCE)) {
    map.addSource(HIGHLIGHT_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(HIGHLIGHT_HALO_LAYER)) {
    map.addLayer({
      id: HIGHLIGHT_HALO_LAYER,
      type: "circle",
      source: HIGHLIGHT_SOURCE,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          ["*", 7, ["+", 1, ["*", 1.7, ["coalesce", ["feature-state", "t"], 0]]]],
          14,
          ["*", 11, ["+", 1, ["*", 1.7, ["coalesce", ["feature-state", "t"], 0]]]],
          17,
          ["*", 15, ["+", 1, ["*", 1.7, ["coalesce", ["feature-state", "t"], 0]]]],
        ],
        "circle-color": "rgba(0, 0, 0, 0)",
        "circle-stroke-color": "#0f4c5c",
        "circle-stroke-width": 2,
        "circle-stroke-opacity": [
          "-",
          0.85,
          ["*", 0.7, ["coalesce", ["feature-state", "t"], 0]],
        ],
      },
    });
  }

  if (!map.getLayer(HIGHLIGHT_DOT_LAYER)) {
    map.addLayer({
      id: HIGHLIGHT_DOT_LAYER,
      type: "circle",
      source: HIGHLIGHT_SOURCE,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          ["*", 4, ["+", 1, ["*", 0.9, ["coalesce", ["feature-state", "t"], 0]]]],
          14,
          ["*", 6, ["+", 1, ["*", 0.9, ["coalesce", ["feature-state", "t"], 0]]]],
          17,
          ["*", 8, ["+", 1, ["*", 0.9, ["coalesce", ["feature-state", "t"], 0]]]],
        ],
        "circle-color": "#0f4c5c",
        "circle-opacity": 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": [
          "+",
          1.5,
          ["*", 1.5, ["coalesce", ["feature-state", "t"], 0]],
        ],
        "circle-stroke-opacity": 1,
      },
    });
  }
}

function setHighlightData(
  map: MapLibreMap,
  camera: Camera | null,
  color: string,
): void {
  const source = map.getSource(HIGHLIGHT_SOURCE) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (!source) return;

  if (!camera) {
    source.setData({ type: "FeatureCollection", features: [] });
    return;
  }

  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: 1,
        geometry: {
          type: "Point",
          coordinates: [camera.longitude, camera.latitude],
        },
        properties: {},
      },
    ],
  });

  if (map.getLayer(HIGHLIGHT_HALO_LAYER)) {
    map.setPaintProperty(HIGHLIGHT_HALO_LAYER, "circle-stroke-color", color);
  }
  if (map.getLayer(HIGHLIGHT_DOT_LAYER)) {
    map.setPaintProperty(HIGHLIGHT_DOT_LAYER, "circle-color", color);
  }
}


type CameraFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      id: string;
      name: string;
      url: string;
      provider: string;
      neighborhood: string;
      region: string;
      online: number;
    };
  }>;
};

function buildCameraGeoJson(cameras: Camera[]): CameraFeatureCollection {
  return {
    type: "FeatureCollection",
    features: cameras.map((camera) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [camera.longitude, camera.latitude],
      },
      properties: {
        id: camera.id,
        name: camera.name,
        url: camera.pageUrl,
        provider: camera.providerName,
        neighborhood: camera.neighborhoodName ?? "",
        region: camera.regionSlug ?? "",
        online: camera.isOnline === false ? 0 : 1,
      },
    })),
  };
}

function createCameraPopupContent(
  name: string,
  provider: string,
  neighborhood: string,
  online: boolean,
): HTMLDivElement {
  const content = document.createElement("div");
  content.className = "map-popup";

  const title = document.createElement("p");
  title.className = "map-popup-title";
  title.textContent = name;

  const meta = document.createElement("p");
  meta.className = "map-popup-meta";
  meta.textContent = [provider, neighborhood].filter(Boolean).join(" · ");

  const hint = document.createElement("p");
  hint.className = "map-popup-meta";
  hint.textContent = online
    ? "Clique para abrir a página oficial."
    : "Câmera offline no provedor — clique para abrir a página oficial.";

  content.append(title, meta, hint);
  return content;
}

function cameraCirclePaint(
  color: string,
): NonNullable<maplibregl.CircleLayerSpecification["paint"]> {
  return {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      3,
      14,
      5,
      17,
      7,
    ],
    // Câmeras offline: cinza claro, 60% de opacidade e contorno escuro,
    // mesmo tamanho das câmeras online.
    "circle-color": ["case", ["==", ["get", "online"], 0], "#b3aca3", color],
    "circle-opacity": ["case", ["==", ["get", "online"], 0], 0.6, 0.95],
    "circle-stroke-color": [
      "case",
      ["==", ["get", "online"], 0],
      "#3f3a36",
      "#ffffff",
    ],
    "circle-stroke-width": 1.2,
    "circle-stroke-opacity": ["case", ["==", ["get", "online"], 0], 0.9, 1],
  };
}

function regionColor(region: string | null | undefined): string {
  return (
    REGION_COLORS[(region ?? "") as keyof typeof REGION_COLORS] ?? "#57534e"
  );
}

function syncCameraLayers(
  map: MapLibreMap,
  cameras: Camera[],
  visible: boolean,
): void {
  // Keep cameras in region-specific sources so each marker uses its region color.
  const byRegion = new Map<string, Camera[]>();
  for (const camera of cameras) {
    const key = camera.regionSlug || "sem-regiao";
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key)!.push(camera);
  }

  // Ensure a source + individual circular marker layer exist for each region.
  for (const [region, list] of byRegion) {
    const sourceId = `cameras-${region}`;
    const pointsId = `cameras-${region}-pontos`;
    const color = regionColor(region === "sem-regiao" ? null : region);
    const paint = cameraCirclePaint(color);

    const source = map.getSource(sourceId) as
      | maplibregl.GeoJSONSource
      | undefined;
    const data = buildCameraGeoJson(list);

    if (source) {
      source.setData(data);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data,
        cluster: false,
      });

      map.addLayer({
        id: pointsId,
        type: "circle",
        source: sourceId,
        paint,
      });
    }

    if (map.getLayer(pointsId)) {
      map.setPaintProperty(pointsId, "circle-color", paint["circle-color"]);
      map.setPaintProperty(pointsId, "circle-opacity", paint["circle-opacity"]);
      map.setPaintProperty(
        pointsId,
        "circle-stroke-color",
        paint["circle-stroke-color"],
      );
      map.setPaintProperty(
        pointsId,
        "circle-stroke-opacity",
        paint["circle-stroke-opacity"],
      );
    }
  }

  // Toggle visibility on the camera layers that belong to the
  // currently filtered set of cameras (region/neighborhood/search).
  const visibleSourceIds = new Set<string>();
  for (const camera of cameras) {
    const key = camera.regionSlug || "sem-regiao";
    visibleSourceIds.add(`cameras-${key}`);
  }

  const allLayers = map.getStyle()?.layers ?? [];
  for (const layer of allLayers) {
    if (!layer.id.startsWith(CAMERA_SOURCE_PREFIX)) {
      continue;
    }
    let sourceId: string | null = null;
    for (const suffix of ["-pontos"]) {
      if (layer.id.endsWith(suffix)) {
        sourceId = layer.id.slice(0, -suffix.length);
        break;
      }
    }
    if (sourceId === null) {
      continue;
    }
    const shouldShow = visibleSourceIds.has(sourceId) && visible;
    map.setLayoutProperty(
      layer.id,
      "visibility",
      shouldShow ? "visible" : "none",
    );
  }
}

function locateUser(
  map: MapLibreMap | null,
  markerRef: { current: MapLibreMarker | null },
): void {
  if (!map || !("geolocation" in navigator)) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const element = document.createElement("div");
      element.className = "map-user-location";
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([longitude, latitude])
        .addTo(map);
      map.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 900,
      });
    },
    () => {
      window.alert(
        "Não foi possível obter sua localização. Verifique a permissão do navegador.",
      );
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export function MapCanvas({
  cameras,
  onSelectNeighborhood,
  showNeighborhoods,
  showCameras,
  highlightedCamera,
  focusPoint,
  focusKey,
  fitBoundsRequest,
  locateRequest,
  theme,
}: {
  cameras: Camera[];
  onSelectNeighborhood: (slug: string) => void;
  showNeighborhoods: boolean;
  showCameras: boolean;
  highlightedCamera: Camera | null;
  focusPoint: { latitude: number; longitude: number } | null;
  focusKey: string;
  fitBoundsRequest: { points: [number, number][]; key: number } | null;
  locateRequest: number;
  theme: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNeighborhoodName, setHoveredNeighborhoodName] = useState<
    string | null
  >(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userLocationMarkerRef = useRef<MapLibreMarker | null>(null);
  const cameraPopupRef = useRef<maplibregl.Popup | null>(null);
  const camerasRef = useRef<Camera[]>(cameras);
  const cameraSyncRef = useRef<{
    map: MapLibreMap;
    sync: () => void;
  } | null>(null);
  const showCamerasRef = useRef(showCameras);
  const onSelectNeighborhoodRef = useRef(onSelectNeighborhood);
  const themeRef = useRef(theme);
  const highlightedCameraRef = useRef<Camera | null>(highlightedCamera);
  const highlightFrameRef = useRef<number | null>(null);

  useEffect(() => {
    camerasRef.current = cameras;
    showCamerasRef.current = showCameras;
    onSelectNeighborhoodRef.current = onSelectNeighborhood;
    themeRef.current = theme;
  }, [cameras, onSelectNeighborhood, showCameras, theme]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[themeRef.current],
      center: initialMapCenter(),
      zoom: 11,
      attributionControl: false,
    });

    // Zoom (+/-) só faz sentido no desktop; no mobile os gestos já resolvem.
    if (window.matchMedia("(min-width: 1024px)").matches) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    const topRightControls = map
      .getContainer()
      .querySelector<HTMLElement>(".maplibregl-ctrl-top-right");
    if (topRightControls) {
      topRightControls.style.top =
        "calc(env(safe-area-inset-top) + 3.125rem)";
    }

    const loadBairros = () => {
      fetch("/bairros.geojson")
        .then((response) => response.json())
        .then((data) => {
          if (!map.getSource("bairros")) {
            map.addSource("bairros", {
              type: "geojson",
              data,
              promoteId: "slug",
            });
          }

          // Sem preenchimento: apenas contornos coloridos.
          const firstCameraLayer = map
            .getStyle()
            ?.layers?.find((layer) => layer.id.startsWith(CAMERA_SOURCE_PREFIX))
            ?.id;

          if (!map.getLayer("bairros-fill")) {
            map.addLayer({
              id: "bairros-fill",
              type: "fill",
              source: "bairros",
              paint: {
                "fill-color": [
                  "match",
                  ["get", "regionSlug"],
                  "centro",
                  "#1d4ed8",
                  "zona-sul",
                  "#0d9488",
                  "zona-norte",
                  "#7c3aed",
                  "zona-oeste",
                  "#ea580c",
                  "zona-sudoeste",
                  "#dc2626",
                  "ilhas",
                  "#db2777",
                  "cidade",
                  "#57534e",
                  "estado",
                  "#475569",
                  "nacional",
                  "#7c3aed",
                  "#57534e",
                ],
                "fill-opacity": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  0.25,
                  0.06,
                ],
              },
            }, firstCameraLayer);
          }

          if (!map.getLayer("bairros-outline")) {
            map.addLayer({
              id: "bairros-outline",
              type: "line",
              source: "bairros",
              paint: {
                "line-color": [
                  "match",
                  ["get", "regionSlug"],
                  "centro",
                  "#1d4ed8",
                  "zona-sul",
                  "#0d9488",
                  "zona-norte",
                  "#7c3aed",
                  "zona-oeste",
                  "#ea580c",
                  "zona-sudoeste",
                  "#dc2626",
                  "ilhas",
                  "#db2777",
                  "cidade",
                  "#57534e",
                  "estado",
                  "#475569",
                  "nacional",
                  "#7c3aed",
                  "#57534e",
                ],
                "line-width": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  3,
                  1.5,
                ],
                "line-opacity": 0.85,
              },
            }, firstCameraLayer);
          }
        })
        .catch(() => {
          // Sem polígonos, apenas os pontos de câmeras são exibidos.
        });
    };

    map.on("style.load", loadBairros);
    loadBairros();

    const loadCameras = () => {
      if (mapRef.current !== map) return;
      const sync = () => {
        if (mapRef.current !== map) return;
        syncCameraLayers(map, camerasRef.current, showCamerasRef.current);
      };
      cameraSyncRef.current = { map, sync };
      sync();
    };

    map.on("style.load", loadCameras);

    const loadHighlight = () => {
      try {
        ensureHighlightLayers(map);
        const camera = highlightedCameraRef.current;
        if (camera) {
          setHighlightData(map, camera, regionColor(camera.regionSlug));
          map.setFeatureState({ source: HIGHLIGHT_SOURCE, id: 1 }, { t: 1 });
        }
      } catch {
        // Style ainda não carregado.
      }
    };
    map.on("style.load", loadHighlight);
    if (map.isStyleLoaded()) {
      loadHighlight();
    }

    let hoveredBairro: string | number | null = null;

    map.on("mousemove", "bairros-fill", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const neighborhoodName = String(feature.properties?.name ?? "");
      setHoveredNeighborhoodName(neighborhoodName || null);
      map.getCanvas().style.cursor = "pointer";
      const nextId = feature.id;
      if (hoveredBairro !== null && hoveredBairro !== nextId) {
        map.removeFeatureState({ source: "bairros", id: hoveredBairro });
      }
      hoveredBairro = nextId ?? null;
      if (nextId !== undefined) {
        map.setFeatureState({ source: "bairros", id: nextId }, { hover: true });
      }
    });

    map.on("mouseleave", "bairros-fill", () => {
      map.getCanvas().style.cursor = "";
      setHoveredNeighborhoodName(null);
      if (hoveredBairro !== null && map.getSource("bairros")) {
        map.removeFeatureState({ source: "bairros", id: hoveredBairro });
        hoveredBairro = null;
      }
    });

    const cameraPointLayers = () =>
      (map.getStyle()?.layers ?? [])
        .map((l) => l.id)
        .filter((id) => id.endsWith("-pontos"));

    map.on("click", "bairros-fill", (e) => {
      const pointLayers = cameraPointLayers();
      const cameraHit =
        pointLayers.length > 0 &&
        map.queryRenderedFeatures(e.point, { layers: pointLayers }).length > 0;
      if (cameraHit) {
        return;
      }

      const feature = e.features?.[0];
      const slug = feature?.properties?.slug as string | undefined;

      if (slug) {
        onSelectNeighborhoodRef.current(slug);
      }
    });

    map.on("mousemove", (event) => {
      const pointLayers = cameraPointLayers();
      if (pointLayers.length === 0) return;
      const features = map.queryRenderedFeatures(event.point, {
        layers: pointLayers,
      });
      const feature = features[0];
      if (!feature) {
        if (cameraPopupRef.current) {
          cameraPopupRef.current.remove();
          cameraPopupRef.current = null;
        }
        return;
      }

      map.getCanvas().style.cursor = "pointer";

      if (!cameraPopupRef.current) {
        cameraPopupRef.current = new maplibregl.Popup({
          offset: 12,
          closeButton: false,
          closeOnClick: false,
          className: "map-popup-shell",
        });
      }

      const properties = feature.properties ?? {};
      cameraPopupRef.current
        .setLngLat(event.lngLat)
        .setDOMContent(
          createCameraPopupContent(
            String(properties.name ?? "Câmera"),
            String(properties.provider ?? ""),
            String(properties.neighborhood ?? ""),
            Number(properties.online) !== 0,
          ),
        )
        .addTo(map);
    });

    map.on("click", (event) => {
      const pointLayers = cameraPointLayers();
      if (pointLayers.length === 0) return;
      const features = map.queryRenderedFeatures(event.point, {
        layers: pointLayers,
      });
      const feature = features[0];
      const url = feature?.properties?.url;
      if (typeof url === "string" && url.length > 0) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });

    mapRef.current = map;

    return () => {
    cameraSyncRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const applyStyle = () => {
      map.setStyle(MAP_STYLES[theme]);
    };

    if (map.isStyleLoaded()) {
      applyStyle();
    } else {
      map.once("load", applyStyle);
      return () => {
        map.off("load", applyStyle);
      };
    }
  }, [theme]);


  useEffect(() => {
    camerasRef.current = cameras;
    showCamerasRef.current = showCameras;
    const entry = cameraSyncRef.current;
    if (entry && entry.map === mapRef.current) {
      entry.sync();
    }
  }, [cameras, showCameras]);

  useEffect(() => {
    highlightedCameraRef.current = highlightedCamera;
    const map = mapRef.current;

    if (highlightFrameRef.current !== null) {
      cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }

    if (!map) {
      return;
    }

    try {
      if (!highlightedCamera) {
        setHighlightData(map, null, "#0f4c5c");
        return;
      }
      setHighlightData(
        map,
        highlightedCamera,
        regionColor(highlightedCamera.regionSlug),
      );
    } catch {
      return;
    }

    // Animação de crescimento (easeOutCubic) ao passar o mouse.
    const start = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      if (mapRef.current !== map) {
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      try {
        map.setFeatureState({ source: HIGHLIGHT_SOURCE, id: 1 }, { t: eased });
      } catch {
        return;
      }
      if (progress < 1) {
        highlightFrameRef.current = requestAnimationFrame(tick);
      } else {
        highlightFrameRef.current = null;
      }
    };
    highlightFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (highlightFrameRef.current !== null) {
        cancelAnimationFrame(highlightFrameRef.current);
        highlightFrameRef.current = null;
      }
    };
  }, [highlightedCamera]);

  useEffect(() => {
    const run = async () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (focusPoint) {
      const mobileOffset = window.matchMedia("(max-width: 1023px)").matches
        ? -Math.round(map.getContainer().clientHeight * 0.17)
        : 0;

      // Se um bairro específico foi selecionado, ajusta o zoom para mostrar
      // o bairro inteiro (fitBounds no polígono do bairro).
      const slug = focusKey; // focusKey = neighborhood slug quando bairro selecionado
      let fitted = false;
      if (slug && slug !== "all") {
        const doFit = async () => {
          try {
            // Busca o polígono do bairro no geojson para ajustar o zoom
            // e mostrar o bairro inteiro.
            const resp = await fetch("/bairros.geojson");
            if (resp.ok) {
              const geojson = await resp.json();
              const feature = geojson.features?.find(
                (f: { properties?: { slug?: string } }) =>
                  f.properties?.slug === slug,
              );
              if (feature?.geometry) {
                const coords = feature.geometry;
                if (
                  coords.type === "Polygon" ||
                  coords.type === "MultiPolygon"
                ) {
                  const bounds = new maplibregl.LngLatBounds();
                  const rings =
                    coords.type === "Polygon"
                      ? coords.coordinates
                      : coords.coordinates.flat();
                  for (const ring of rings) {
                    for (const coord of ring) {
                      bounds.extend(coord as [number, number]);
                    }
                  }
                  const isMobile = window.matchMedia("(max-width: 1023px)").matches;
                  map.fitBounds(bounds, {
                    padding: isMobile
                      ? { top: 40, bottom: 220, left: 40, right: 40 }
                      : { top: 40, bottom: 40, left: 40, right: 380 },
                    duration: 700,
                    maxZoom: 15,
                  });
                  fitted = true;
                }
              }
            }
          } catch {
            // Fallback para flyTo abaixo.
          }
        };

        await doFit();
      }

      if (!fitted) {
        map.flyTo({
          center: [focusPoint.longitude, focusPoint.latitude],
          zoom: 12,
          offset: [0, mobileOffset],
          duration: 700,
        });
      }
      return;
    }
    };
    void run();
  }, [focusPoint, focusKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    for (const layerId of ["bairros-fill", "bairros-outline"]) {
      const layer = map.getLayer(layerId);
      if (layer) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          showNeighborhoods ? "visible" : "none",
        );
      }
    }
  }, [showNeighborhoods]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBoundsRequest || fitBoundsRequest.points.length === 0) {
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const point of fitBoundsRequest.points) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
  }, [fitBoundsRequest]);

  useEffect(() => {
    if (locateRequest > 0) {
      locateUser(mapRef.current, userLocationMarkerRef);
    }
  }, [locateRequest]);

  return (
    <>
      <div ref={containerRef} className="size-full" />
      {showNeighborhoods && hoveredNeighborhoodName ? (
        <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)_+_4rem)] z-10 max-w-[calc(100%_-_8rem)] -translate-x-1/2 truncate rounded-lg border border-line bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-md backdrop-blur">
          {hoveredNeighborhoodName}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2">
        <span className="pointer-events-auto whitespace-nowrap rounded bg-background/70 px-1.5 py-0.5 text-[10px] leading-tight text-muted backdrop-blur-sm">
          <a
            href="https://openfreemap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand hover:underline"
          >
            OpenFreeMap
          </a>
          {" · "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand hover:underline"
          >
            © OpenStreetMap
          </a>
        </span>
      </div>
    </>
  );
}
