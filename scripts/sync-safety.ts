/**
 * Sincroniza as camadas de segurança pública:
 * - Pontos de apoio e abrigos da Defesa Civil Municipal (ArcGIS público).
 * - Hospitais do CNES/DATASUS (tipos 5 e 7, ativos, com coordenadas),
 *   apenas da rede pública (natureza jurídica 1xxx ou empresa pública).
 *
 * Uso:
 *   npm run db:safety
 *
 * Fonte, atribuição e data da fonte são gravadas em cada item.
 * Nenhum dado de visitante é coletado aqui.
 */
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { safetyFacilities } from "../src/db/schema";
import { fetchJson } from "./lib/http";
import {
  findBairro,
  loadBairros,
  type BairroFeature,
} from "./lib/bairros";
import { finishIngestRun, startIngestRun } from "./lib/runs";

const DEFESA_BASE =
  "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Defesa_Civil/Defesa_Civil/FeatureServer";
const CNES_URL =
  "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos";
const CNES_PAGE_SIZE = 20;
const CNES_MAX_OFFSET = 2_000;
const DATA_RIO_UNIDADES_URL =
  "https://services1.arcgis.com/OlP4dGNtIcnD3RYf/arcgis/rest/services/OSA2/FeatureServer/0/query";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT =
  "errejota-live/1.4.2 (+https://github.com/victorcapile/errejota-live)";
/** left,top,right,bottom (lon/lat) da cidade do Rio de Janeiro. */
const RIO_VIEWBOX = "-43.85,-22.70,-43.05,-23.12";
/** Acima disso, a coordenada do CNES é considerada divergente. */
const GEOCODE_MAX_DRIFT_M = 1_000;
const GEOCODE_DELAY_MS = 1_100;
const DEFESA_SOURCE_URL = `${DEFESA_BASE}/1`;
const DEFESA_UPDATED_AT = "2018-10-02T15:29:22.000Z";
const CNES_SOURCE_URL = "https://cnes.datasus.gov.br/";

const DEFESA_SOURCE = "Defesa Civil Municipal do Rio de Janeiro";
const DEFESA_ATTRIBUTION =
  "Defesa Civil Municipal do Rio de Janeiro — uso público, citada a fonte.";
const CNES_SOURCE = "CNES/DATASUS — Ministério da Saúde";
const CNES_ATTRIBUTION =
  "Ministério da Saúde — CNES (dados abertos).";

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
};

type ArcGisPayload = {
  features?: ArcGisFeature[];
  error?: unknown;
};

type CnesEstablishment = {
  codigo_cnes?: number;
  nome_fantasia?: string | null;
  nome_razao_social?: string | null;
  codigo_tipo_unidade?: number;
  endereco_estabelecimento?: string | null;
  numero_estabelecimento?: string | null;
  bairro_estabelecimento?: string | null;
  latitude_estabelecimento_decimo_grau?: number | null;
  longitude_estabelecimento_decimo_grau?: number | null;
  numero_telefone_estabelecimento?: string | null;
  descricao_turno_atendimento?: string | null;
  descricao_natureza_juridica_estabelecimento?: string | null;
};

type CnesPayload = {
  estabelecimentos?: CnesEstablishment[];
};

type DataRioUnit = {
  attributes?: {
    CNES?: string | number | null;
    CNES_?: string | number | null;
    NOME?: string | null;
    BAIRRO?: string | null;
  };
  geometry?: { x?: number; y?: number };
};

type DataRioPayload = {
  features?: DataRioUnit[];
  error?: unknown;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

type FacilityRow = typeof safetyFacilities.$inferInsert;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * O CNES não expõe um campo direto de "público/privado" (a esfera
 * administrativa é a esfera de gestão do SUS e marca particulares como
 * municipal). A natureza jurídica é o indicador confiável:
 * - 1xxx: administração pública direta e indireta (federal, estadual,
 *   municipal, autarquias e fundações públicas);
 * - 2011: empresa pública;
 * - 2038: sociedade de economia mista (controle público).
 * Tudo o mais (sociedades anônimas, limitadas, fundações e associações
 * privadas) fica de fora.
 */
function isPublicCnes(natureza: string | null): boolean {
  if (!natureza) return false;
  if (natureza.startsWith("1")) return true;
  return natureza === "2011" || natureza === "2038";
}

function normalizeCnes(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.replace(/\D/g, "") || null;
  }
  return null;
}

/** Distância em metros entre dois pontos (Haversine). */
function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Coordenadas oficiais das unidades municipais de saúde (Data.Rio/ArcGIS).
 * O CNES repete coordenadas erradas para vários estabelecimentos; o Data.Rio
 * corrige os municipais e é usado como primeira opção.
 */
async function fetchDataRioUnits(): Promise<
  Map<string, { latitude: number; longitude: number }>
> {
  const units = new Map<string, { latitude: number; longitude: number }>();
  try {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "CNES,CNES_,NOME,BAIRRO",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
      resultRecordCount: "3000",
    });
    const payload = await fetchJson<DataRioPayload>(
      `${DATA_RIO_UNIDADES_URL}?${params.toString()}`,
      {
        timeoutMs: 60_000,
        retries: 2,
        headers: { Referer: "https://www.data.rio/" },
        validate: (data) => {
          const parsed = data as DataRioPayload;
          if (!parsed || !Array.isArray(parsed.features)) {
            throw new Error("Payload do Data.Rio inválido.");
          }
        },
      },
    );

    for (const feature of payload.features ?? []) {
      const cnes =
        normalizeCnes(feature.attributes?.CNES) ??
        normalizeCnes(feature.attributes?.CNES_);
      const latitude = number(feature.geometry?.y);
      const longitude = number(feature.geometry?.x);
      if (cnes && latitude !== null && longitude !== null) {
        units.set(cnes, { latitude, longitude });
      }
    }
  } catch (error) {
    console.warn("Data.Rio indisponível; mantendo coordenadas do CNES:", error);
  }
  return units;
}

/** Geocodificação direta via Nominatim/OSM, limitada à cidade do Rio. */
async function forwardGeocode(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const params = new URLSearchParams({
      q: `${address}, Rio de Janeiro, RJ, Brasil`,
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      viewbox: RIO_VIEWBOX,
      bounded: "1",
    });
    const payload = await fetchJson<NominatimResult[]>(
      `${NOMINATIM_URL}?${params.toString()}`,
      {
        timeoutMs: 30_000,
        retries: 0,
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          Referer: "https://www.openstreetmap.org/",
        },
        validate: (data) => {
          if (!Array.isArray(data)) {
            throw new Error("Payload do Nominatim inválido.");
          }
        },
      },
    );
    const first = payload[0];
    const latitude = first ? Number(first.lat) : NaN;
    const longitude = first ? Number(first.lon) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function withBairro(
  row: FacilityRow,
  bairros: BairroFeature[],
): FacilityRow {
  const bairro = findBairro(row.longitude, row.latitude, bairros);
  return {
    ...row,
    neighborhoodSlug: bairro?.properties.slug ?? null,
    regionSlug: bairro?.properties.regionSlug ?? null,
  };
}

async function fetchArcGis(layer: number): Promise<ArcGisFeature[]> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "json",
    resultRecordCount: "2000",
  });
  const payload = await fetchJson<ArcGisPayload>(
    `${DEFESA_BASE}/${layer}/query?${params.toString()}`,
    {
      timeoutMs: 60_000,
      retries: 3,
      headers: { Referer: "https://pgeo3.rio.rj.gov.br/" },
      validate: (data) => {
        const parsed = data as ArcGisPayload;
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Payload ArcGIS inválido.");
        }
        if (parsed.error) {
          throw new Error(`ArcGIS: ${JSON.stringify(parsed.error)}`);
        }
      },
    },
  );
  return payload.features ?? [];
}

function supportRows(
  features: ArcGisFeature[],
  bairros: BairroFeature[],
  syncedAt: string,
): FacilityRow[] {
  const rows: FacilityRow[] = [];
  for (const feature of features) {
    const attributes = feature.attributes ?? {};
    const latitude = number(feature.geometry?.y);
    const longitude = number(feature.geometry?.x);
    if (latitude === null || longitude === null) continue;

    const externalId = `defesa-apoio-${String(
      attributes.cod_papoio ?? attributes.objectid ?? "",
    )}`;
    const name =
      text(attributes.pontos_apo) ??
      text(attributes.nome_favela) ??
      "Ponto de apoio";

    rows.push(
      withBairro(
        {
          id: `safety_${externalId}`,
          kind: "support_point",
          externalId,
          name,
          address: text(attributes.end_rco),
          neighborhoodSlug: null,
          regionSlug: null,
          latitude,
          longitude,
          sourceLabel: DEFESA_SOURCE,
          sourceUrl: DEFESA_SOURCE_URL,
          attribution: DEFESA_ATTRIBUTION,
          sourceUpdatedAt: DEFESA_UPDATED_AT,
          syncedAt,
          metadata: JSON.stringify({
            community: text(attributes.nome_favela),
            reference: text(attributes.ref_cia),
            mainPoint: text(attributes.pto_ppal),
          }),
          isActive: true,
        },
        bairros,
      ),
    );
  }
  return rows;
}

function shelterRows(
  features: ArcGisFeature[],
  bairros: BairroFeature[],
  syncedAt: string,
): FacilityRow[] {
  const rows: FacilityRow[] = [];
  for (const feature of features) {
    const attributes = feature.attributes ?? {};
    const latitude = number(feature.geometry?.y);
    const longitude = number(feature.geometry?.x);
    if (latitude === null || longitude === null) continue;

    const info = text(attributes.info) ?? "";
    const address = info.split(/<br\s*\/?>/i)[0]?.trim() || null;
    const link = info.match(/https?:\/\/\S+/)?.[0] ?? null;
    const externalId = `defesa-abrigo-${String(
      attributes.objectid ?? "",
    )}`;

    rows.push(
      withBairro(
        {
          id: `safety_${externalId}`,
          kind: "shelter",
          externalId,
          name: text(attributes.nome) ?? "Abrigo",
          address,
          neighborhoodSlug: null,
          regionSlug: null,
          latitude,
          longitude,
          sourceLabel: DEFESA_SOURCE,
          sourceUrl: `${DEFESA_BASE}/3`,
          attribution: DEFESA_ATTRIBUTION,
          sourceUpdatedAt: DEFESA_UPDATED_AT,
          syncedAt,
          metadata: JSON.stringify({ link }),
          isActive: true,
        },
        bairros,
      ),
    );
  }
  return rows;
}

async function fetchCnesPage(
  type: number,
  offset: number,
): Promise<CnesEstablishment[]> {
  const params = new URLSearchParams({
    codigo_municipio: "330455",
    codigo_tipo_unidade: String(type),
    status: "1",
    limit: String(CNES_PAGE_SIZE),
    offset: String(offset),
  });
  const payload = await fetchJson<CnesPayload>(
    `${CNES_URL}?${params.toString()}`,
    {
      timeoutMs: 45_000,
      retries: 3,
      headers: { Referer: "https://cnes.datasus.gov.br/" },
      validate: (data) => {
        const parsed = data as CnesPayload;
        if (!parsed || !Array.isArray(parsed.estabelecimentos)) {
          throw new Error("Payload do CNES inválido.");
        }
      },
    },
  );
  return payload.estabelecimentos ?? [];
}

async function hospitalRows(
  bairros: BairroFeature[],
  syncedAt: string,
): Promise<FacilityRow[]> {
  const rows = new Map<string, FacilityRow>();
  const dataRioUnits = await fetchDataRioUnits();

  for (const type of [5, 7]) {
    for (
      let offset = 0;
      offset < CNES_MAX_OFFSET;
      offset += CNES_PAGE_SIZE
    ) {
      const page = await fetchCnesPage(type, offset);
      if (page.length === 0) break;

      for (const item of page) {
        const cnes = item.codigo_cnes;
        const cnesLatitude = number(
          item.latitude_estabelecimento_decimo_grau,
        );
        const cnesLongitude = number(
          item.longitude_estabelecimento_decimo_grau,
        );
        if (!cnes || cnesLatitude === null || cnesLongitude === null) {
          continue;
        }
        const natureza = text(
          item.descricao_natureza_juridica_estabelecimento,
        );
        if (!isPublicCnes(natureza)) {
          continue;
        }
        if (rows.has(String(cnes))) continue;

        const addressParts = [
          text(item.endereco_estabelecimento),
          text(item.numero_estabelecimento),
          text(item.bairro_estabelecimento),
        ].filter(Boolean);
        const address =
          addressParts.length > 0 ? addressParts.join(", ") : null;

        let latitude = cnesLatitude;
        let longitude = cnesLongitude;
        let coordinateSource: "data-rio" | "nominatim" | "cnes" = "cnes";

        const dataRioPoint = dataRioUnits.get(String(cnes));
        if (dataRioPoint) {
          latitude = dataRioPoint.latitude;
          longitude = dataRioPoint.longitude;
          coordinateSource = "data-rio";
        } else if (address) {
          const geocoded = await forwardGeocode(address);
          await new Promise((resolve) =>
            setTimeout(resolve, GEOCODE_DELAY_MS),
          );
          if (geocoded) {
            const geocodedBairro = findBairro(
              geocoded.longitude,
              geocoded.latitude,
              bairros,
            );
            const cnesBairro = findBairro(
              cnesLongitude,
              cnesLatitude,
              bairros,
            );
            const drift = distanceMeters(
              { latitude, longitude },
              geocoded,
            );
            const differentBairro =
              !cnesBairro ||
              cnesBairro.properties.slug !==
                geocodedBairro?.properties.slug;
            if (
              geocodedBairro &&
              (differentBairro || drift > GEOCODE_MAX_DRIFT_M)
            ) {
              latitude = geocoded.latitude;
              longitude = geocoded.longitude;
              coordinateSource = "nominatim";
            }
          }
        }

        // Fora dos bairros do município = coordenada inválida; não plota.
        if (!findBairro(longitude, latitude, bairros)) {
          console.warn(
            `Hospital ignorado por coordenada fora do município: ${text(item.nome_fantasia) ?? text(item.nome_razao_social) ?? cnes}`,
          );
          continue;
        }

        const externalId = `cnes-${cnes}`;
        rows.set(
          String(cnes),
          withBairro(
            {
              id: `safety_${externalId}`,
              kind: "hospital",
              externalId,
              name:
                text(item.nome_fantasia) ??
                text(item.nome_razao_social) ??
                "Hospital",
              address,
              neighborhoodSlug: null,
              regionSlug: null,
              latitude,
              longitude,
              sourceLabel: CNES_SOURCE,
              sourceUrl: CNES_SOURCE_URL,
              attribution: CNES_ATTRIBUTION,
              sourceUpdatedAt: null,
              syncedAt,
              metadata: JSON.stringify({
                cnes: String(cnes),
                type: type === 5 ? "Hospital Geral" : "Hospital Especializado",
                naturezaJuridica: natureza,
                coordinateSource,
                phone: text(item.numero_telefone_estabelecimento),
                turnoAtendimento: text(
                  item.descricao_turno_atendimento,
                ),
              }),
              isActive: true,
            },
            bairros,
          ),
        );
      }

      if (page.length < CNES_PAGE_SIZE) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return [...rows.values()];
}

async function upsert(rows: FacilityRow[]): Promise<number> {
  let processed = 0;
  for (const row of rows) {
    await db
      .insert(safetyFacilities)
      .values(row)
      .onConflictDoUpdate({
        target: [safetyFacilities.kind, safetyFacilities.externalId],
        set: {
          name: row.name,
          address: row.address,
          neighborhoodSlug: row.neighborhoodSlug,
          regionSlug: row.regionSlug,
          latitude: row.latitude,
          longitude: row.longitude,
          sourceLabel: row.sourceLabel,
          sourceUrl: row.sourceUrl,
          attribution: row.attribution,
          sourceUpdatedAt: row.sourceUpdatedAt,
          syncedAt: row.syncedAt,
          metadata: row.metadata,
          isActive: true,
        },
      });
    processed += 1;
  }
  return processed;
}

/**
 * Desativa registros que deixaram de vir da fonte (ex.: hospitais
 * particulares removidos pelo filtro de natureza jurídica). Só roda depois
 * que todas as fontes foram lidas com sucesso, para não apagar dado bom por
 * falha parcial.
 */
async function deactivateMissing(rows: FacilityRow[]): Promise<number> {
  const ids = rows.map((row) => row.externalId);
  if (ids.length === 0) {
    return 0;
  }
  const updated = await db
    .update(safetyFacilities)
    .set({ isActive: false })
    .where(
      and(
        eq(safetyFacilities.isActive, true),
        inArray(safetyFacilities.kind, [
          "support_point",
          "shelter",
          "hospital",
        ]),
        notInArray(safetyFacilities.externalId, ids),
      ),
    )
    .returning({ id: safetyFacilities.id });
  return updated.length;
}

async function main() {
  const runId = await startIngestRun("safety");
  let processed = 0;

  try {
    const bairros = loadBairros();
    const syncedAt = new Date().toISOString();

    const supportFeatures = await fetchArcGis(1);
    const shelterFeatures = await fetchArcGis(3);
    const supports = supportRows(supportFeatures, bairros, syncedAt);
    const shelters = shelterRows(shelterFeatures, bairros, syncedAt);
    const hospitals = await hospitalRows(bairros, syncedAt);

    processed += await upsert(supports);
    processed += await upsert(shelters);
    processed += await upsert(hospitals);

    const deactivated = await deactivateMissing([
      ...supports,
      ...shelters,
      ...hospitals,
    ]);

    await finishIngestRun(
      runId,
      "success",
      processed,
      null,
      `${supports.length} pontos de apoio; ${shelters.length} abrigos; ${hospitals.length} hospitais; ${deactivated} desativados.`,
    );

    console.log(
      `Segurança: ${supports.length} pontos de apoio, ${shelters.length} abrigos, ${hospitals.length} hospitais (${deactivated} desativados).`,
    );
  } catch (error) {
    await finishIngestRun(runId, "failed", processed, String(error));
    console.error("Falha na sincronização de segurança:", error);
    process.exitCode = 1;
  }
}

void main().finally(async () => {
  await closeDb();
});
