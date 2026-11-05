import fs from "node:fs";
import path from "node:path";

export type BairroFeature = {
  properties: { slug: string; name: string; regionSlug: string };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
  bounds?: [number, number, number, number];
};

const BAIRROS_FILE = path.join(process.cwd(), "public", "bairros.geojson");

/** Carrega os limites de bairros e pré-calcula a caixa envolvente. */
export function loadBairros(): BairroFeature[] {
  const data = JSON.parse(fs.readFileSync(BAIRROS_FILE, "utf8")) as {
    features: BairroFeature[];
  };

  return data.features.map((bairro) => {
    const polygons =
      bairro.geometry.type === "Polygon"
        ? [bairro.geometry.coordinates]
        : bairro.geometry.coordinates;
    const bounds: [number, number, number, number] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
    ];

    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [longitude, latitude] of ring) {
          bounds[0] = Math.min(bounds[0], longitude);
          bounds[1] = Math.min(bounds[1], latitude);
          bounds[2] = Math.max(bounds[2], longitude);
          bounds[3] = Math.max(bounds[3], latitude);
        }
      }
    }

    return { ...bairro, bounds };
  });
}

/** Mapa nome normalizado → slug, para casar nomes vindos de planilhas. */
export function buildNameSlugMap(
  bairros: BairroFeature[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const bairro of bairros) {
    map.set(normalizeName(bairro.properties.name), bairro.properties.slug);
  }
  return map;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pointInRing(
  longitude: number,
  latitude: number,
  ring: number[][],
): boolean {
  let inside = false;

  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current, current += 1
  ) {
    const [currentLon, currentLat] = ring[current];
    const [previousLon, previousLat] = ring[previous];

    const intersects =
      currentLat > latitude !== previousLat > latitude &&
      longitude <
        ((previousLon - currentLon) * (latitude - currentLat)) /
          (previousLat - currentLat) +
          currentLon;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: number[][][],
): boolean {
  if (!pointInRing(longitude, latitude, polygon[0])) {
    return false;
  }
  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(longitude, latitude, polygon[index])) {
      return false;
    }
  }
  return true;
}

export function findBairro(
  longitude: number,
  latitude: number,
  bairros: BairroFeature[],
): BairroFeature | null {
  for (const bairro of bairros) {
    const bounds = bairro.bounds;
    if (
      bounds &&
      (longitude < bounds[0] ||
        latitude < bounds[1] ||
        longitude > bounds[2] ||
        latitude > bounds[3])
    ) {
      continue;
    }

    if (bairro.geometry.type === "Polygon") {
      if (pointInPolygon(longitude, latitude, bairro.geometry.coordinates)) {
        return bairro;
      }
    } else {
      for (const polygon of bairro.geometry.coordinates) {
        if (pointInPolygon(longitude, latitude, polygon)) {
          return bairro;
        }
      }
    }
  }

  return null;
}
