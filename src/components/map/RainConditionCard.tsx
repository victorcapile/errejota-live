"use client";

import { CloudRain, Moon, Sun } from "lucide-react";
import type { NeighborhoodCondition } from "@/lib/types";

function rainHeadline(mm: number | null): string {
  if (mm === null) return "Sem dados de chuva";
  if (mm === 0) return "Sem chuva na estação";
  if (mm < 2) return "Chuva fraca";
  if (mm < 5) return "Chuva moderada";
  return "Chuva forte";
}

function rainStationLine(condition: NeighborhoodCondition): string {
  if (condition.rainMaxMm === null) {
    return "Sem estação com leitura recente por perto";
  }
  const station = condition.rainStationName ?? "estação";
  const distance =
    condition.rainDistanceKm && condition.rainDistanceKm > 0
      ? ` (${condition.rainDistanceKm.toFixed(1)} km)`
      : "";
  return `${station}${distance}`;
}

/**
 * Ícone do estado do tempo: nuvem de chuva quando há registro de chuva;
 * sol de dia e lua à noite quando está sem chuva.
 */
export function RainIcon({ mm }: { mm: number | null }) {
  if (mm !== null && mm > 0) {
    return (
      <CloudRain
        aria-hidden
        className="size-4 shrink-0 text-brand"
      />
    );
  }

  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;

  return isDay ? (
    <Sun aria-hidden className="size-4 shrink-0 text-amber-500" />
  ) : (
    <Moon aria-hidden className="size-4 shrink-0 text-slate-500 dark:text-slate-300" />
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
  const time = condition.rainReadingAt
    ? new Date(condition.rainReadingAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "sem leitura";

  return (
    <div className="rain-card-enter flex items-center gap-2.5 rounded-xl border border-line bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
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
          {rainStationLine(condition)} ·{" "}
          <a
            href="https://alertario.rio.rj.gov.br/mapa-de-chuvas/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            Alerta Rio
          </a>
        </p>
      </div>
      <p
        className="shrink-0 text-[9px] tabular-nums text-muted"
        title="Horário da leitura na estação (fonte Alerta Rio). A coleta no Errejota ocorre poucos minutos depois."
      >
        atualizado {time}
      </p>
    </div>
  );
}
