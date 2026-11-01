"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

import { REGION_COLORS } from "@/lib/constants";
import type { Camera, NeighborhoodSummary } from "@/lib/types";

const RIO_CENTER: [number, number] = [-43.1729, -22.9068];

const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const CAMERA_SOURCE_PREFIX = "cameras-";

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
      },
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function regionColorExpression(): any {
  const entries: any[] = ["match", ["get", "region"]];
  for (const [slug, color] of Object.entries(REGION_COLORS)) {
    entries.push(slug, color);
  }
  entries.push("#57534e");
  return entries;
}

function createCameraPopupContent(
  name: string,
  provider: string,
  neighborhood: string,
): HTMLDivElement {
  const content = document.createElement("div");
  content.className = "sauron-popup";

  const title = document.createElement("p");
  title.className = "sauron-popup-title";
  title.textContent = name;

  const meta = document.createElement("p");
  meta.className = "sauron-popup-meta";
  meta.textContent = [provider, neighborhood].filter(Boolean).join(" · ");

  const hint = document.createElement("p");
  hint.className = "sauron-popup-meta";
  hint.textContent = "Clique para abrir a página oficial.";

  content.append(title, meta, hint);
  return content;
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
  // Group cameras by region so each cluster is homogeneous in color.
  const byRegion = new Map<string, Camera[]>();
  for (const camera of cameras) {
    const key = camera.regionSlug || "sem-regiao";
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key)!.push(camera);
  }

  // Ensure a source + layers exist for each region.
  for (const [region, list] of byRegion) {
    const sourceId = `cameras-${region}`;
    const clusterId = `cameras-${region}-clusters`;
    const countId = `cameras-${region}-count`;
    const pointsId = `cameras-${region}-pontos`;
    const color = regionColor(region === "sem-regiao" ? null : region);

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
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      });

      map.addLayer({
        id: clusterId,
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": color,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            9,
            10,
            13,
            50,
            18,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.75,
        },
      });

      map.addLayer({
        id: countId,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 10,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addLayer({
        id: pointsId,
        type: "circle",
        source: sourceId,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            3,
            14,
            5,
            17,
            8,
          ],
          "circle-color": color,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
        },
      });
    }
  }

  // Toggle visibility on all camera layers.
  const allLayers = map.getStyle().layers ?? [];
  for (const layer of allLayers) {
    if (layer.id.startsWith(CAMERA_SOURCE_PREFIX)) {
      map.setLayoutProperty(
        layer.id,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  }
}

class LocateControl implements maplibregl.IControl {
  private map: MapLibreMap | null = null;
  private container: HTMLDivElement | null = null;
  private marker: MapLibreMarker | null = null;

  onAdd(map: MapLibreMap) {
    this.map = map;
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibregl-ctrl-icon sauron-locate-btn";
    button.title = "Mostrar minha localização";
    button.setAttribute("aria-label", "Mostrar minha localização");
    button.textContent = "◎";
    button.addEventListener("click", () => this.locate());
    container.append(button);
    this.container = container;
    return container;
  }

  onRemove() {
    this.container?.remove();
    this.container = null;
    this.marker?.remove();
    this.marker = null;
    this.map = null;
  }

  private locate() {
    if (!this.map || !("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = this.map;
        if (!map) {
          return;
        }
        const { latitude, longitude } = position.coords;
        this.marker?.remove();
        const element = document.createElement("div");
        element.className = "sauron-user-location";
        element.textContent = "●";
        this.marker = new maplibregl.Marker({ element, anchor: "center" })
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
}

export function MapCanvas({
  cameras,
  onSelectNeighborhood,
  neighborhoods,
  showNeighborhoods,
  showCameras,
  regionKey,
  focusPoint,
  focusKey,
  fitBoundsRequest,
  theme,
}: {
  cameras: Camera[];
  onSelectNeighborhood: (slug: string) => void;
  neighborhoods: NeighborhoodSummary[];
  showNeighborhoods: boolean;
  showCameras: boolean;
  regionKey: string;
  focusPoint: { latitude: number; longitude: number } | null;
  focusKey: string;
  fitBoundsRequest: { points: [number, number][]; key: number } | null;
  theme: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cameraPopupRef = useRef<maplibregl.Popup | null>(null);
  const camerasRef = useRef<Camera[]>(cameras);
  const cameraSyncRef = useRef<{
    map: MapLibreMap;
    sync: () => void;
  } | null>(null);
  const showCamerasRef = useRef(showCameras);
  const userLocatedRef = useRef(false);
  const neighborhoodsRef = useRef<NeighborhoodSummary[]>(neighborhoods ?? []);
  const showNeighborhoodsRef = useRef(showNeighborhoods);
  const onSelectNeighborhoodRef = useRef(onSelectNeighborhood);
  const themeRef = useRef(theme);

  camerasRef.current = cameras;
  showCamerasRef.current = showCameras;
  neighborhoodsRef.current = neighborhoods ?? [];
  showNeighborhoodsRef.current = showNeighborhoods;
  onSelectNeighborhoodRef.current = onSelectNeighborhood;
  themeRef.current = theme;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[themeRef.current],
      center: RIO_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(new LocateControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
      }),
      "bottom-right",
    );

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
            });
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
            });
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

    let hoveredBairro: string | number | null = null;

    map.on("mousemove", "bairros-fill", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
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
      if (hoveredBairro !== null && map.getSource("bairros")) {
        map.removeFeatureState({ source: "bairros", id: hoveredBairro });
        hoveredBairro = null;
      }
    });

    const cameraPointLayers = () =>
      (map.getStyle().layers ?? [])
        .map((l) => l.id)
        .filter((id) => id.endsWith("-pontos"));
    const cameraClusterLayers = () =>
      (map.getStyle().layers ?? [])
        .map((l) => l.id)
        .filter((id) => id.endsWith("-clusters"));

    map.on("click", "bairros-fill", (e) => {
      const pointLayers = cameraPointLayers();
      const clusterLayers = cameraClusterLayers();
      const layers = [...pointLayers, ...clusterLayers];
      const cameraHit =
        layers.length > 0 &&
        map.queryRenderedFeatures(e.point, { layers }).length > 0;
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
          className: "sauron-map-popup",
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
      const url = features[0]?.properties?.url;
      if (typeof url === "string" && url.length > 0) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });


    // Centraliza no usuário, se a permissão for concedida.
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          userLocatedRef.current = true;
          map.flyTo({
            center: [longitude, latitude],
            zoom: 13,
            duration: 0,
          });
          const element = document.createElement("div");
          element.className = "sauron-user-location";
          element.textContent = "●";
          new maplibregl.Marker({ element, anchor: "center" })
            .setLngLat([longitude, latitude])
            .addTo(map);
        },
        () => {
          // Permissão negada ou indisponível: mantém a visão padrão do Rio.
        },
        { timeout: 8000, maximumAge: 60000 },
      );
    }

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
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (focusPoint) {
      map.flyTo({
        center: [focusPoint.longitude, focusPoint.latitude],
        zoom: 14,
        duration: 900,
      });
      return;
    }
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

  return <div ref={containerRef} className="size-full" />;
}
