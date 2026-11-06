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
    return (
      <CloudRain
        aria-hidden
        className="size-4 shrink-0 text-brand"
      />
    );
  }

  if (hour === null) {
    return <span aria-hidden className="size-4 shrink-0" />;
  }

  const isDay = hour >= 6 && hour < 18;

  return isDay ? (
    <Sun aria-hidden className="size-4 shrink-0 text-amber-500" />
  ) : (
    <Moon aria-hidden className="size-4 shrink-0 text-slate-500 dark:text-slate-300" />
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
      <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-muted">
        Risco de alagamento
      </span>
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-foreground">
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: FLOOD_RISK_LEVEL_COLORS[assessment.level] }}
        />
        {FLOOD_RISK_LEVEL_LABELS[assessment.level]}
      </span>
    </span>
  );
}

/**
 * Conteúdo compartilhado entre o card flutuante do celular e o card do
 * dossiê no desktop. Mantém o mesmo layout compacto nos dois.
 */
export function RainConditionSummary({
  condition,
}: {
  condition: NeighborhoodCondition;
}) {
  const freshness = rainFreshness(condition.rainReadingAt);
  const assessment = assessFloodRisk(condition.rainMaxMm, condition.riskClass);
  const showRisk = assessment.rain !== "sem_chuva" && !freshness.stale;
  const freshnessText = freshness.stale
    ? `leitura ${freshness.time} · desatualizado`
    : `atualizado ${freshness.time}`;

  return (
    <div className="flex items-center gap-2.5">
      <RainIcon mm={condition.rainMaxMm} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5 text-[11px] font-semibold leading-snug text-foreground">
          <span className="truncate">{rainHeadline(condition.rainMaxMm)}</span>
          {condition.rainMaxMm !== null ? (
            <span className="shrink-0 text-[10px] font-normal text-muted">
              {condition.rainMaxMm.toLocaleString("pt-BR")} mm
            </span>
          ) : null}
        </p>
        <p className="truncate text-[9px] leading-tight text-muted">
          <span
            suppressHydrationWarning
            className={
              freshness.stale
                ? "font-medium text-amber-600 dark:text-amber-400"
                : undefined
            }
            title={
              freshness.stale
                ? "Leitura antiga: a fonte não atualizou nas últimas coletas."
                : `Horário da leitura na estação ${
                    condition.rainStationName ?? "mais próxima"
                  }${
                    condition.rainDistanceKm && condition.rainDistanceKm > 0
                      ? ` a ${condition.rainDistanceKm.toFixed(1)} km`
                      : ""
                  } (fonte Alerta Rio). A coleta no Errejota ocorre poucos minutos depois.`
            }
          >
            {freshnessText}
          </span>
        </p>
      </div>
      {showRisk ? <CompactFloodRisk assessment={assessment} /> : null}
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
    <div className="rain-card-enter rounded-xl border border-line bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <RainConditionSummary condition={condition} />
    </div>
  );
}
