"use client";

import { useEffect, useState } from "react";
import { CloudRain, Moon, Sun } from "lucide-react";
import {
  FLOOD_RISK_LEVEL_COLORS,
  FLOOD_RISK_LEVEL_LABELS,
  assessFloodRisk,
  floodRiskTitle,
  type FloodRiskAssessment,
} from "@/lib/flood-risk";
import {
  RAIN_ALERT_COLORS,
  classifyRain,
  rainThresholdTitle,
  rainWindowLabel,
  type RainAlertLevel,
  type RainWindow,
} from "@/lib/rain-alert";
import { rainFreshness, rainHeadline } from "@/lib/rain-labels";
import type { NeighborhoodCondition } from "@/lib/types";

/**
 * Ícone do estado do tempo: nuvem de chuva quando há registro de chuva;
 * sol de dia e lua à noite quando está sem chuva.
 */
export function RainIcon({ mm }: { mm: number | null }) {
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(new Date().getHours());
  }, []);

  if (mm !== null && mm > 0) {
    return <CloudRain aria-hidden className="size-4 shrink-0 text-accent" />;
  }

  if (hour === null) {
    return <span aria-hidden className="size-4 shrink-0" />;
  }

  const isDay = hour >= 6 && hour < 18;

  return isDay ? (
    <Sun aria-hidden className="size-4 shrink-0 text-accent" />
  ) : (
    <Moon aria-hidden className="size-4 shrink-0 text-muted" />
  );
}

function RainValue({
  window,
  mm,
  level,
}: {
  window: RainWindow;
  mm: number | null;
  level: RainAlertLevel;
}) {
  const hasValue = mm !== null;
  const color = hasValue ? RAIN_ALERT_COLORS[level] : "#94a3b8";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1"
      title={rainThresholdTitle(window)}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-[1px]"
        style={{ background: color }}
      />
      <span className="font-mono text-[10px] font-medium tabular-nums text-foreground">
        {mm === null ? "—" : `${mm.toLocaleString("pt-BR")} mm`}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
        ({rainWindowLabel(window)})
      </span>
    </span>
  );
}

/**
 * Versão compacta do risco: duas linhas curtas no canto direito, sem criar
 * uma linha extra no card.
 */
function CompactFloodRisk({
  assessment,
}: {
  assessment: FloodRiskAssessment;
}) {
  return (
    <span
      className="flex shrink-0 flex-col items-end gap-0.5 text-right"
      title={floodRiskTitle(assessment)}
    >
      <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-muted">
        Risco de alagamento
      </span>
      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground">
        <span
          aria-hidden
          className="size-1.5 rounded-[1px]"
          style={{ background: FLOOD_RISK_LEVEL_COLORS[assessment.level] }}
        />
        {FLOOD_RISK_LEVEL_LABELS[assessment.level]}
      </span>
    </span>
  );
}

/**
 * Conteúdo compartilhado entre o card flutuante do celular e o card do
 * dossiê no desktop. Mostra apenas 1h e 24h para deixar espaço ao risco.
 */
export function RainConditionSummary({
  condition,
}: {
  condition: NeighborhoodCondition;
}) {
  const freshness = rainFreshness(condition.rainReadingAt);
  const values = {
    mm1h: condition.rain1hMm,
    mm24h: condition.rain24hMm,
    mm96h: condition.rain96hMm,
  };
  const classification = classifyRain(values);
  const assessment = assessFloodRisk(values, condition.riskClass);
  const unavailable =
    !classification.hasData || condition.rainStatus !== "ok";
  const showRisk = !unavailable && assessment.level !== "nao_avaliado";

  const headline = unavailable
    ? "Dados indisponíveis"
    : rainHeadline(condition.rain1hMm);
  const freshnessText = !condition.rainReadingAt
    ? "sem leitura"
    : condition.rainStatus !== "ok"
      ? `dados indisponíveis · última leitura ${freshness.time}`
      : `atualizado ${freshness.time}`;
  const stationText = condition.rainStationName
    ? `${condition.rainStationName}${
        condition.rainDistanceKm && condition.rainDistanceKm > 0
          ? ` · ${condition.rainDistanceKm.toFixed(1)} km`
          : ""
      }`
    : null;

  return (
    <div className="flex items-center gap-2.5">
      <RainIcon mm={condition.rain1hMm} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.1em] leading-snug text-foreground">
            {headline}
          </p>
          {showRisk ? <CompactFloodRisk assessment={assessment} /> : null}
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[8px] leading-tight text-muted">
          <RainValue
            window="1h"
            mm={condition.rain1hMm}
            level={classification.byWindow["1h"]}
          />
          <span aria-hidden className="shrink-0 text-muted/50">
            |
          </span>
          <RainValue
            window="24h"
            mm={condition.rain24hMm}
            level={classification.byWindow["24h"]}
          />
          <span
            suppressHydrationWarning
            className={`min-w-0 break-words ${
              unavailable
                ? "font-medium text-amber-600 dark:text-amber-400"
                : ""
            }`}
            title={
              unavailable
                ? "A fonte não atualizou nas últimas coletas. Os valores acima são a última leitura conhecida e não devem ser lidos como ausência de chuva ou de risco."
                : `Leitura na estação ${
                    condition.rainStationName ?? "mais próxima"
                  }${
                    condition.rainDistanceKm && condition.rainDistanceKm > 0
                      ? ` a ${condition.rainDistanceKm.toFixed(1)} km`
                      : ""
                  } (fonte Alerta Rio). A coleta no Errejota ocorre a cada ~5 min.`
            }
          >
            {freshnessText}
            {stationText ? ` · ${stationText}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Card de chuva do bairro selecionado. Fica fora do painel de câmeras,
 * flutuando logo acima dele (com animação de entrada).
 */
export function RainConditionCard({
  condition,
}: {
  condition: NeighborhoodCondition;
}) {
  return (
    <div className="rain-card-enter border-y border-line bg-card px-3 py-2">
      <RainConditionSummary condition={condition} />
    </div>
  );
}
