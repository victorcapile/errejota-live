import { getCityStage } from "./city-stage";
import { ADVANCED_STAGE_LEVEL, normalizeCityStage } from "./constants";
import type { CityStageStatus, CityStageView } from "./types";

/**
 * Modo avançado da cidade.
 *
 * Não há mais estado persistente nem histerese: o modo é derivado
 * diretamente do estágio oficial. Sempre que a cidade está em estágio 3, 4
 * ou 5, o mapa entra no modo avançado (chuva, risco por bairro e ajuda
 * ligados; câmeras desligadas). Abaixo disso, volta ao normal.
 */
export type CriticalModeView = {
  active: boolean;
  since: string | null;
  stage: CityStageView;
  stageStatus: CityStageStatus;
  manualOverride: "on" | "off" | null;
  manualOverrideUntil: string | null;
  evaluatedAt: string | null;
  reason: string;
};

export async function getCriticalMode(): Promise<CriticalModeView> {
  const stageResult = await getCityStage();
  const stage = normalizeCityStage(stageResult.stage?.stage);
  const active = stage ? Number(stage) >= ADVANCED_STAGE_LEVEL : false;

  return {
    active,
    since: active ? (stageResult.stage?.effectiveAt ?? null) : null,
    stage: stageResult.stage,
    stageStatus: stageResult.status,
    manualOverride: null,
    manualOverrideUntil: null,
    evaluatedAt: new Date().toISOString(),
    reason: active ? "stage_advanced" : "stage_normal",
  };
}
