/**
 * Limiares de chuva usados como referência no errejota.live.
 *
 * Fonte: Ehrlich et al. (2021), citado como referência atual na tese
 * "Rainfall and Landslides in the Municipality of Rio de Janeiro" (UFRJ, 2026).
 * A tabela operacional histórica do Alerta Rio (2005) é mantida em /sobre.
 *
 * Importante: estes limiares são indicativos. O alerta oficial é sempre o do
 * Sistema Alerta Rio / COR-Rio / Defesa Civil.
 */

export type RainAlertLevel = "nenhum" | "medio" | "alto" | "muito_alto";
export type RainWindow = "1h" | "24h" | "96h";

export type RainWindowValues = {
  mm1h: number | null;
  mm24h: number | null;
  mm96h: number | null;
};

export const RAIN_ALERT_LABELS: Record<RainAlertLevel, string> = {
  nenhum: "Sem limiar",
  medio: "Médio",
  alto: "Alto",
  muito_alto: "Muito alto",
};

export const RAIN_ALERT_COLORS: Record<RainAlertLevel, string> = {
  nenhum: "#22c55e",
  medio: "#eab308",
  alto: "#f97316",
  muito_alto: "#dc2626",
};

export const RAIN_ALERT_SEVERITY: Record<RainAlertLevel, number> = {
  nenhum: 0,
  medio: 1,
  alto: 2,
  muito_alto: 3,
};

/** Limiares em mm (1h e 24h) e mm/24h + mm/96h (janela de 96h). */
export const RAIN_THRESHOLDS = {
  "1h": { medio: 25, alto: 50, muitoAlto: 80 },
  "24h": { medio: 85, alto: 140, muitoAlto: 220 },
  "96h": {
    medio: { mm96h: 140, mm24h: 25 },
    alto: { mm96h: 220, mm24h: 50 },
    muitoAlto: { mm96h: 300, mm24h: 100 },
  },
} as const;

function levelFromValue(
  value: number | null,
  thresholds: { medio: number; alto: number; muitoAlto: number },
): RainAlertLevel {
  if (value === null || !Number.isFinite(value)) {
    return "nenhum";
  }
  if (value > thresholds.muitoAlto) {
    return "muito_alto";
  }
  if (value >= thresholds.alto) {
    return "alto";
  }
  if (value >= thresholds.medio) {
    return "medio";
  }
  return "nenhum";
}

export function classifyRain1h(mm: number | null): RainAlertLevel {
  return levelFromValue(mm, RAIN_THRESHOLDS["1h"]);
}

export function classifyRain24h(mm: number | null): RainAlertLevel {
  return levelFromValue(mm, RAIN_THRESHOLDS["24h"]);
}

/**
 * A janela de 96h é combinada com a de 24h, como na tabela de referência:
 * o acumulado de 96h só é classificado quando o de 24h também atinge a faixa.
 */
export function classifyRain96h(
  mm96h: number | null,
  mm24h: number | null,
): RainAlertLevel {
  if (
    mm96h === null ||
    mm24h === null ||
    !Number.isFinite(mm96h) ||
    !Number.isFinite(mm24h)
  ) {
    return "nenhum";
  }
  if (
    mm96h > RAIN_THRESHOLDS["96h"].muitoAlto.mm96h &&
    mm24h > RAIN_THRESHOLDS["96h"].muitoAlto.mm24h
  ) {
    return "muito_alto";
  }
  if (
    mm96h >= RAIN_THRESHOLDS["96h"].alto.mm96h &&
    mm24h >= RAIN_THRESHOLDS["96h"].alto.mm24h
  ) {
    return "alto";
  }
  if (
    mm96h >= RAIN_THRESHOLDS["96h"].medio.mm96h &&
    mm24h >= RAIN_THRESHOLDS["96h"].medio.mm24h
  ) {
    return "medio";
  }
  return "nenhum";
}

export type RainClassification = {
  level: RainAlertLevel;
  byWindow: Record<RainWindow, RainAlertLevel>;
  hasData: boolean;
  highestWindow: RainWindow | null;
};

export function classifyRain(values: RainWindowValues): RainClassification {
  const byWindow: Record<RainWindow, RainAlertLevel> = {
    "1h": classifyRain1h(values.mm1h),
    "24h": classifyRain24h(values.mm24h),
    "96h": classifyRain96h(values.mm96h, values.mm24h),
  };

  let level: RainAlertLevel = "nenhum";
  let highestWindow: RainWindow | null = null;

  for (const window of ["1h", "24h", "96h"] as const) {
    if (RAIN_ALERT_SEVERITY[byWindow[window]] > RAIN_ALERT_SEVERITY[level]) {
      level = byWindow[window];
      highestWindow = window;
    }
  }

  return {
    level,
    byWindow,
    hasData:
      values.mm1h !== null ||
      values.mm24h !== null ||
      values.mm96h !== null,
    highestWindow,
  };
}

export function rainThresholdTitle(window: RainWindow): string {
  if (window === "1h") {
    return "Referência 1h: 25–50 mm médio; 50–80 mm alto; >80 mm muito alto.";
  }
  if (window === "24h") {
    return "Referência 24h: 85–140 mm médio; 140–220 mm alto; >220 mm muito alto.";
  }
  return "Referência 96h: 140–220 mm (com 24h 25–50) médio; 220–300 mm (com 24h 50–100) alto; >300 mm (com 24h >100) muito alto.";
}

export function rainWindowLabel(window: RainWindow): string {
  return window === "1h" ? "1h" : window === "24h" ? "24h" : "96h";
}
