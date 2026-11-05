/**
 * Ingestão do indicador de risco de inundação por bairro.
 *
 * Fonte oficial: ISMFI — Índice de Susceptibilidade do Meio Físico à
 * Inundação (COPPE/UFRJ), por setor censitário, publicado no serviço
 * geográfico público da Prefeitura (pgeo3.rio.rj.gov.br).
 *
 * Uso:
 *   npm run db:risk
 *
 * O script agrega o índice por bairro (média e máximo) e grava em
 * `risk_indicators`. A geometria bruta não é armazenada.
 *
 * Observação: a camada de suscetibilidade a inundação da CPRM também está
 * disponível no serviço municipal, mas seus polígonos se sobrepõem e cruzam
 * limites de bairro — a agregação por bairro ficaria distorcida. Por isso ela
 * não entra no score; pode ser usada como camada visual de contexto.
 */
import { closeDb, db } from "@/db";
import { riskIndicators } from "@/db/schema";
import { SOURCE_SEED } from "@/db/seed-data/sources";
import { seedSourceList } from "@/db/seed-sources";
import type { RiskClass } from "@/lib/constants";
import { fetchJson } from "./lib/http";
import {
  buildNameSlugMap,
  loadBairros,
  normalizeName,
  type BairroFeature,
} from "./lib/bairros";
import { finishIngestRun, startIngestRun } from "./lib/runs";

const ISMFI_QUERY =
  "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/" +
  encodeURI(
    "Estudos/ISMFI_Indice_de_Suscetibilidade_do_Meio_Fisico_a_Inundacoes/FeatureServer/0/query",
  );

const SOURCE_SLUG = "coppe-ufrj";

type IsmfiStats = {
  features?: Array<{
    attributes: {
      nm_bairro?: string;
      avg_ismfi?: number;
      max_ismfi?: number;
      cnt?: number;
    };
  }>;
};

function ismfiClass(avgIndex: number): RiskClass {
  if (avgIndex < 25) {
    return "baixa";
  }
  if (avgIndex < 50) {
    return "media";
  }
  return "alta";
}

async function loadIsmfiStats() {
  const stats = JSON.stringify([
    {
      statisticType: "avg",
      onStatisticField: "ismfi_v45",
      outStatisticFieldName: "avg_ismfi",
    },
    {
      statisticType: "max",
      onStatisticField: "ismfi_v45",
      outStatisticFieldName: "max_ismfi",
    },
    {
      statisticType: "count",
      onStatisticField: "ismfi_v45",
      outStatisticFieldName: "cnt",
    },
  ]);
  const params = new URLSearchParams({
    where: "nm_municip='RIO DE JANEIRO'",
    groupByFieldsForStatistics: "nm_bairro",
    outStatistics: stats,
    returnGeometry: "false",
    f: "json",
  });

  const payload = await fetchJson<IsmfiStats>(
    `${ISMFI_QUERY}?${params.toString()}`,
    {
      timeoutMs: 60_000,
      retries: 3,
      validate: (data) => {
        if (!data || typeof data !== "object") {
          throw new Error("Resposta do ISMFI inválida.");
        }
      },
    },
  );

  return payload.features ?? [];
}

async function main() {
  const runId = await startIngestRun("risk");
  let processed = 0;

  try {
    const sourceSeed = SOURCE_SEED.filter(
      (source) => source.slug === SOURCE_SLUG,
    );
    if (sourceSeed.length === 0) {
      throw new Error(`Fonte "${SOURCE_SLUG}" ausente em SOURCE_SEED.`);
    }
    await seedSourceList(sourceSeed);

    const bairros: BairroFeature[] = loadBairros();
    const nameToSlug = buildNameSlugMap(bairros);
    const regions = new Map(
      bairros.map((bairro) => [
        bairro.properties.slug,
        bairro.properties.regionSlug,
      ]),
    );
    const now = new Date().toISOString();

    const ismfi = await loadIsmfiStats();
    let count = 0;
    let unmatched = 0;

    for (const feature of ismfi) {
      const attributes = feature.attributes ?? {};
      const name = attributes.nm_bairro ?? "";
      const avg = Number(attributes.avg_ismfi);
      const slug = name ? nameToSlug.get(normalizeName(name)) : null;

      if (!slug || !Number.isFinite(avg)) {
        unmatched += 1;
        continue;
      }

      await db
        .insert(riskIndicators)
        .values({
          id: `risk_flood_ismfi_${slug}`,
          neighborhoodSlug: slug,
          regionSlug: regions.get(slug) ?? null,
          sourceId: `source_${SOURCE_SLUG}`,
          kind: "flood_ismfi",
          class: ismfiClass(avg),
          score: avg,
          coverage: null,
          computedAt: now,
          sourceVersion: "ismfi-v45",
        })
        .onConflictDoUpdate({
          target: [
            riskIndicators.neighborhoodSlug,
            riskIndicators.sourceId,
            riskIndicators.kind,
          ],
          set: {
            class: ismfiClass(avg),
            score: avg,
            computedAt: now,
            sourceVersion: "ismfi-v45",
          },
        });
      count += 1;
    }

    processed = count;

    await finishIngestRun(
      runId,
      unmatched > 0 ? "partial" : "success",
      processed,
      unmatched > 0 ? `${unmatched} bairro(s) sem correspondência.` : null,
      `ISMFI: ${count} bairros com indicador.`,
    );

    console.log(
      `Risco: ISMFI ${count} bairros, ${unmatched} sem correspondência.`,
    );
  } catch (error) {
    await finishIngestRun(runId, "failed", processed, String(error));
    console.error("Falha na ingestão de risco:", error);
    process.exitCode = 1;
  }
}

void main().finally(async () => {
  await closeDb();
});
