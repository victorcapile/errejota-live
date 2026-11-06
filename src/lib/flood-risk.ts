import { RISK_CLASS_LABELS, type RiskClass } from "./constants";

export type RainIntensity = "sem_chuva" | "fraca" | "moderada" | "forte";
export type FloodRiskLevel =
  | "nao_avaliado"
  | "baixo"
  | "moderado"
  | "alto";
export type AssessedFloodRiskLevel = Exclude<
  FloodRiskLevel,
  "nao_avaliado"
>;

export const RAIN_INTENSITY_LABELS: Record<RainIntensity, string> = {
  sem_chuva: "Sem chuva",
  fraca: "Chuva fraca",
  moderada: "Chuva moderada",
  forte: "Chuva forte",
};

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

/** Mesmos cortes usados no card de chuva. */
export function rainIntensity(mm: number | null): RainIntensity {
  if (mm === null || mm < 0.1) return "sem_chuva";
  if (mm < 2.5) return "fraca";
  if (mm < 10) return "moderada";
  return "forte";
}

/**
 * Cruzamento chuva × suscetibilidade estrutural (ISMFI).
 * A chuva fraca só eleva o risco quando o território já é muito suscetível;
 * a chuva moderada/forte pesa mais em bairros de risco médio/alto.
 */
const MATRIX: Record<
  "baixa" | "media" | "alta",
  Record<"fraca" | "moderada" | "forte", AssessedFloodRiskLevel>
> = {
  baixa: { fraca: "baixo", moderada: "baixo", forte: "moderado" },
  media: { fraca: "baixo", moderada: "moderado", forte: "alto" },
  alta: { fraca: "moderado", moderada: "alto", forte: "alto" },
};

export type FloodRiskAssessment = {
  rain: RainIntensity;
  structural: RiskClass;
  level: FloodRiskLevel;
};

export function assessFloodRisk(
  rainMm: number | null,
  structuralClass: RiskClass | null,
): FloodRiskAssessment {
  const rain = rainIntensity(rainMm);
  const structural = structuralClass ?? "nao_avaliado";

  if (rain === "sem_chuva" || structural === "nao_avaliado") {
    return { rain, structural, level: "nao_avaliado" };
  }

  return {
    rain,
    structural,
    level: MATRIX[structural][rain],
  };
}

export function floodRiskTitle(assessment: FloodRiskAssessment): string {
  const rain = RAIN_INTENSITY_LABELS[assessment.rain];
  const structural = RISK_CLASS_LABELS[assessment.structural];
  const level = FLOOD_RISK_LEVEL_LABELS[assessment.level];

  return `Risco de alagamento ${level.toLowerCase()}: ${rain.toLowerCase()} + ISMFI ${structural.toLowerCase()}. Base: estação mais próxima (Alerta Rio) e suscetibilidade do território (COPPE/UFRJ). Não é previsão nem alerta em tempo real.`;
}
