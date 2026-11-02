/**
 * Importa câmeras de um CSV local para o mapa.
 *
 * Uso:
 *   npm run db:cameras                 # lê data/cameras.csv (ou data/cameras.json)
 *   npm run db:cameras -- --file=outro.json
 *   npm run db:cameras -- --replace    # remove do banco o que não está no arquivo
 *
 * Aceita CSV (colunas external_id,name,latitude,longitude,page_url...) ou JSON
 * (array de objetos, ou objeto com a chave "cameras"). O importador não acessa
 * nenhum serviço externo. Ele apenas lê o arquivo que você forneceu e grava os
 * pontos no PostgreSQL configurado em DATABASE_URL. Cada ponto guarda um link
 * para a página oficial do provedor; nenhum vídeo é baixado ou embutido.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cameras, neighborhoods } from "@/db/schema";
import type { CameraImportReport } from "@/lib/types";

const DEFAULT_FILE = path.join(process.cwd(), "data", "cameras.csv");
const DEFAULT_PROVIDER = "COR-Rio";
const DEFAULT_PAGE_URL = "https://appcor.cor-rio.work/mapa/cameras/";
const SOURCE_ID = "source_cor-rio-cameras";

const RIO_BOUNDS = {
  minLon: -43.95,
  maxLon: -42.9,
  minLat: -23.2,
  maxLat: -22.6,
};

type BairroFeature = {
  properties: { slug: string; name: string; regionSlug: string };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
  bounds?: [number, number, number, number];
};

type ParsedRow = {
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  pageUrl: string;
  providerName: string;
  neighborhoodSlug: string | null;
};

const HEADER_ALIASES: Record<string, string[]> = {
  externalId: [
    "externalid",
    "id",
    "apiid",
    "cameraid",
    "codigo",
    "code",
    "idcam",
  ],
  name: ["name", "nome", "titulo", "title", "descricao", "local"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lon", "lng", "long"],
  pageUrl: [
    "pageurl",
    "url",
    "link",
    "linkpagina",
    "pagina",
    "endereco",
  ],
  providerName: ["providername", "provider", "provedor", "fonte", "operador"],
  neighborhoodSlug: [
    "neighborhoodslug",
    "neighborhood",
    "bairroslug",
    "bairro",
  ],
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((current) => current.some((cell) => cell.trim() !== ""));
}

function readCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseDelimited(raw, delimiter);

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map(normalizeHeader);
  const keys = Object.entries(HEADER_ALIASES).map(([key, aliases]) => {
    const index = header.findIndex((cell) => aliases.includes(cell));
    return [key, index] as const;
  });

  const missing = keys
    .filter(([key, index]) => index === -1 && ["externalId", "latitude", "longitude"].includes(key))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `CSV sem colunas obrigatórias: ${missing.join(", ")}. Cabeçalho esperado: external_id,name,latitude,longitude,page_url`,
    );
  }

  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    for (const [key, index] of keys) {
      if (index >= 0) {
        record[key] = (cells[index] ?? "").trim();
      }
    }
    return record;
  });
}

/**
 * Converte um objeto arbitrário (item de JSON) em um registro com as chaves
 * canônicas usadas pelo importador, respeitando os mesmos apelidos do CSV.
 */
function recordFromObject(raw: Record<string, unknown>): Record<string, string> {
  const normalized = new Map<string, string>();

  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = normalizeHeader(key);
    if (!normalized.has(normalizedKey)) {
      normalized.set(
        normalizedKey,
        value === null || value === undefined ? "" : String(value).trim(),
      );
    }
  }

  const record: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const value = normalized.get(alias);
      if (value !== undefined && value !== "") {
        record[field] = value;
        break;
      }
    }
  }

  return record;
}

function readJson(filePath: string): Record<string, string>[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;

  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { cameras?: unknown }).cameras)
  ) {
    list = (raw as { cameras: unknown[] }).cameras;
  } else {
    throw new Error(
      'JSON sem lista de câmeras. Esperado um array ou um objeto com a chave "cameras".',
    );
  }

  return list.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Item ${index} do JSON não é um objeto.`);
    }
    return recordFromObject(item as Record<string, unknown>);
  });
}

function readInput(filePath: string): {
  records: Record<string, string>[];
  format: "csv" | "json";
} {
  const isJson = path.extname(filePath).toLowerCase() === ".json";
  return {
    records: isJson ? readJson(filePath) : readCsv(filePath),
    format: isJson ? "json" : "csv",
  };
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
  // Buracos do polígono.
  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(longitude, latitude, polygon[index])) {
      return false;
    }
  }
  return true;
}

function loadBairros(): BairroFeature[] {
  const file = path.join(process.cwd(), "public", "bairros.geojson");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
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

function findBairro(
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
      if (
        pointInPolygon(longitude, latitude, bairro.geometry.coordinates)
      ) {
        return bairro;
      }
    } else if (
      bairro.geometry.coordinates.some((polygon) =>
        pointInPolygon(longitude, latitude, polygon),
      )
    ) {
      return bairro;
    }
  }
  return null;
}

function sanitizePageUrl(raw: string | undefined): {
  pageUrl: string;
  warning: string | null;
} {
  if (!raw) {
    return { pageUrl: DEFAULT_PAGE_URL, warning: null };
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return {
        pageUrl: DEFAULT_PAGE_URL,
        warning: `URL não é https e foi substituída pela página oficial (${raw}).`,
      };
    }
    return { pageUrl: parsed.toString(), warning: null };
  } catch {
    return {
      pageUrl: DEFAULT_PAGE_URL,
      warning: `URL inválida substituída pela página oficial (${raw}).`,
    };
  }
}

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let replace = false;

  for (const arg of argv) {
    if (arg === "--replace") {
      replace = true;
    } else if (arg.startsWith("--file=")) {
      file = path.resolve(process.cwd(), arg.slice("--file=".length));
    }
  }

  // Conveniência: sem --file, aceita data/cameras.json se o CSV não existir.
  if (file === DEFAULT_FILE && !fs.existsSync(file)) {
    const jsonFile = path.join(process.cwd(), "data", "cameras.json");
    if (fs.existsSync(jsonFile)) {
      file = jsonFile;
    }
  }

  return { file, replace };
}

function buildImportRow(
  record: Record<string, string>,
  bairros: BairroFeature[],
  warnings: string[],
): { row: ParsedRow | null; outsideRio: boolean } {
  const externalId = record.externalId;
  const name = record.name || externalId;
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (!externalId) {
    warnings.push("Linha sem external_id ignorada.");
    return { row: null, outsideRio: false };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    warnings.push(`Coordenadas inválidas para "${externalId}" ignorada.`);
    return { row: null, outsideRio: false };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    warnings.push(`Coordenadas fora do planeta para "${externalId}" ignorada.`);
    return { row: null, outsideRio: false };
  }

  const outsideRio =
    longitude < RIO_BOUNDS.minLon ||
    longitude > RIO_BOUNDS.maxLon ||
    latitude < RIO_BOUNDS.minLat ||
    latitude > RIO_BOUNDS.maxLat;

  const { pageUrl, warning } = (() => {
    if (record.pageUrl) {
      return sanitizePageUrl(record.pageUrl);
    }

    if (/^\d{6}$/.test(externalId)) {
      const params = new URLSearchParams({ name: name || externalId });
      return {
        pageUrl: `https://appcor.cor-rio.work/mapa/cameras/transmissao/${externalId}/?${params.toString()}`,
        warning: null,
      };
    }

    return { pageUrl: DEFAULT_PAGE_URL, warning: null };
  })();

  if (warning) {
    warnings.push(`${externalId}: ${warning}`);
  }

  const neighborhoodSlug = (() => {
    const explicit = record.neighborhoodSlug?.trim();
    if (explicit && bairros.some((bairro) => bairro.properties.slug === explicit)) {
      return explicit;
    }
    if (explicit) {
      warnings.push(
        `${externalId}: bairro "${explicit}" não existe; usando o contorno mais próximo.`,
      );
    }
    return findBairro(longitude, latitude, bairros)?.properties.slug ?? null;
  })();

  return {
    row: {
      externalId,
      name,
      latitude,
      longitude,
      pageUrl,
      providerName: record.providerName || DEFAULT_PROVIDER,
      neighborhoodSlug,
    },
    outsideRio,
  };
}

async function main() {
  const { file, replace } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(file)) {
    console.error(`Arquivo não encontrado: ${file}`);
    console.error(
      "Crie data/cameras.csv com as colunas external_id,name,latitude,longitude,page_url ou use um .json com a lista de câmeras.",
    );
    process.exit(1);
  }

  const { records, format } = readInput(file);
  console.log(`${records.length} registros lidos de ${path.basename(file)} (${format}).`);
  const bairros = loadBairros();
  const neighborhoodRows = await db
    .select({ id: neighborhoods.id, slug: neighborhoods.slug })
    .from(neighborhoods);
  const neighborhoodIds = new Map(
    neighborhoodRows.map((row) => [row.slug, row.id]),
  );

  const warnings: string[] = [];
  const parsed: ParsedRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let outsideRio = 0;

  for (const record of records) {
    if (record.externalId && seen.has(record.externalId)) {
      warnings.push(`external_id duplicado ignorado: ${record.externalId}`);
      skipped += 1;
      continue;
    }

    const { row, outsideRio: isOutside } = buildImportRow(
      record,
      bairros,
      warnings,
    );

    if (!row) {
      skipped += 1;
      continue;
    }

    if (isOutside) {
      outsideRio += 1;
    }

    seen.add(row.externalId);
    parsed.push(row);
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const bairroRegions = new Map<string, string | null>(
    bairros.map((bairro) => [
      bairro.properties.slug,
      bairro.properties.regionSlug,
    ]),
  );

  const values = parsed.map((row) => {
    const id = `camera_${createHash("sha1")
      .update(row.externalId)
      .digest("hex")
      .slice(0, 16)}`;
    const regionSlug = row.neighborhoodSlug
      ? bairroRegions.get(row.neighborhoodSlug) ?? null
      : null;
    const neighborhoodId = row.neighborhoodSlug
      ? neighborhoodIds.get(row.neighborhoodSlug) ?? null
      : null;

    return {
      id,
      externalId: row.externalId,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      pageUrl: row.pageUrl,
      providerName: row.providerName,
      sourceId: SOURCE_ID,
      neighborhoodId,
      neighborhoodSlug: row.neighborhoodSlug,
      regionSlug,
      importedAt: today,
      updatedAt: now,
    };
  });

  // Lotes pequenos para caber no limite de parâmetros do SQLite.
  const BATCH_SIZE = 60;
  for (let start = 0; start < values.length; start += BATCH_SIZE) {
    const batch = values.slice(start, start + BATCH_SIZE);

    await db
      .insert(cameras)
      .values(batch)
      .onConflictDoUpdate({
        target: cameras.id,
        set: {
          name: sql`excluded.name`,
          latitude: sql`excluded.latitude`,
          longitude: sql`excluded.longitude`,
          pageUrl: sql`excluded.page_url`,
          providerName: sql`excluded.provider_name`,
          sourceId: sql`excluded.source_id`,
          neighborhoodId: sql`excluded.neighborhood_id`,
          neighborhoodSlug: sql`excluded.neighborhood_slug`,
          regionSlug: sql`excluded.region_slug`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    const written = Math.min(start + BATCH_SIZE, values.length);
    if (written % 500 === 0 || written === values.length) {
      console.log(`  ${written}/${values.length} câmeras gravadas…`);
    }
  }

  let replaced = 0;
  if (replace) {
    const externalIds = parsed.map((row) => row.externalId);
    const result = externalIds.length
      ? await db
          .delete(cameras)
          .where(notInArray(cameras.externalId, externalIds))
      : await db.delete(cameras);
    replaced = Number(
      (result as { rowsAffected?: number }).rowsAffected ?? 0,
    );
  }

  const report: CameraImportReport = {
    totalRows: records.length,
    imported: parsed.length,
    skipped,
    locatedInNeighborhood: parsed.filter((row) => row.neighborhoodSlug).length,
    withoutNeighborhood: parsed.filter((row) => !row.neighborhoodSlug).length,
    replaced,
    outsideRio,
    warnings: warnings.slice(0, 20),
  };

  console.log("\nImportação concluída.");
  console.log(JSON.stringify(report, null, 2));

  if (warnings.length > report.warnings.length) {
    console.log(
      `\n+${warnings.length - report.warnings.length} avisos omitidos.`,
    );
  }
}

main().catch((error) => {
  console.error("Falha ao importar câmeras:", error);
  process.exit(1);
});
