import { RISK_CLASS_LABELS, type RiskClass } from "./constants";
import {
  RAIN_ALERT_LABELS,
  classifyRain,
  rainThresholdTitle,
  type RainAlertLevel,
  type RainWindow,
  type RainWindowValues,
} from "./rain-alert";

export type FloodRiskLevel = "nao_avaliado" | "baixo" | "moderado" | "alto";
export type AssessedFloodRiskLevel = Exclude<
  FloodRiskLevel,
  "nao_avaliado"
>;

export const FLOOD_RISK_LEVEL_LABELS: Record<FloodRiskLevel, string> = {
  nao_avaliado: "Não avaliado",
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
};

export const FLOOD_RISK_LEVEL_COLORS: Record<FloodRiskLevel, string> = {
  nao_avaliado: "#94a3b8",
  baixo: "#22c55e",
  moderado: "#eab308",
  alto: "#dc2626",
};

/**
 * Cruzamento do limiar de chuva (1h/24h/96h) com a suscetibilidade
 * estrutural do território (ISMFI). É um indicativo de alagamento, não um
 * alerta oficial: o alerta oficial é do Alerta Rio / COR-Rio / Defesa Civil.
 */
const MATRIX: Record<
  "baixa" | "media" | "alta",
  Record<Exclude<RainAlertLevel, "nenhum">, AssessedFloodRiskLevel>
> = {
  baixa: { medio: "baixo", alto: "moderado", muito_alto: "alto" },
  media: { medio: "moderado", alto: "alto", muito_alto: "alto" },
  alta: { medio: "alto", alto: "alto", muito_alto: "alto" },
};

export type FloodRiskAssessment = {
  rainAlert: RainAlertLevel;
  byWindow: Record<RainWindow, RainAlertLevel>;
  rainHasData: boolean;
  highestWindow: RainWindow | null;
  structural: RiskClass;
  level: FloodRiskLevel;
};

export function assessFloodRisk(
  values: RainWindowValues,
  structuralClass: RiskClass | null,
): FloodRiskAssessment {
  const classification = classifyRain(values);
  const structural = structuralClass ?? "nao_avaliado";

  if (!classification.hasData || structural === "nao_avaliado") {
    return {
      rainAlert: classification.level,
      byWindow: classification.byWindow,
      rainHasData: classification.hasData,
      highestWindow: classification.highestWindow,
      structural,
      level: "nao_avaliado",
    };
  }

  // Sem chuva não há alagamento por chuva: risco baixo, não "não avaliado".
  if (classification.level === "nenhum") {
    return {
      rainAlert: classification.level,
      byWindow: classification.byWindow,
      rainHasData: classification.hasData,
      highestWindow: classification.highestWindow,
      structural,
      level: "baixo",
    };
  }

  return {
    rainAlert: classification.level,
    byWindow: classification.byWindow,
    rainHasData: classification.hasData,
    highestWindow: classification.highestWindow,
    structural,
    level: MATRIX[structural][classification.level],
  };
}

export function floodRiskTitle(assessment: FloodRiskAssessment): string {
  const rain = RAIN_ALERT_LABELS[assessment.rainAlert];
  const structural = RISK_CLASS_LABELS[assessment.structural];
  const level = FLOOD_RISK_LEVEL_LABELS[assessment.level];
  const window = assessment.highestWindow ?? "1h";

  return `Risco de alagamento ${level.toLowerCase()} (indicativo): limiar de chuva ${rain.toLowerCase()} em ${window} + ISMFI ${structural.toLowerCase()}. ${rainThresholdTitle(window)} Referência: Ehrlich et al. (2021). Não é alerta oficial; acompanhe o Alerta Rio, o COR-Rio e a Defesa Civil.`;
}
