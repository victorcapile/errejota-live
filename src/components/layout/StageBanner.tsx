"use client";

import { useEffect, useState } from "react";
import {
  CITY_STAGE_DESCRIPTIONS,
  CITY_STAGE_SHORT_LABELS,
  normalizeCityStage,
} from "@/lib/constants";
import { fetchCriticalMode } from "@/lib/critical-mode-client";
import type { CriticalModeView } from "@/lib/critical-mode";

const REFRESH_MS = 60_000;

const EMPTY: CriticalModeView = {
  active: false,
  since: null,
  stage: null,
  stageStatus: "unavailable",
  manualOverride: null,
  manualOverrideUntil: null,
  evaluatedAt: null,
  reason: "error",
};

/**
 * Faixa do estágio operacional dentro do header. A cor é sempre a oficial do
 * COR-Rio; o modo avançado do mapa é derivado do estágio, não da faixa.
 */
export function StageBanner() {
  const [data, setData] = useState<CriticalModeView | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = (force = false) => {
      void fetchCriticalMode(force).then((payload) => {
        if (!cancelled) {
          setData(payload ?? EMPTY);
        }
      });
    };

    load();
    const timer = window.setInterval(() => load(), REFRESH_MS);
    const onStageUpdated = () => load(true);
    window.addEventListener("errejota:stage-updated", onStageUpdated);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("errejota:stage-updated", onStageUpdated);
    };
  }, []);

  const stage = data?.stage ?? null;
  if (!stage) {
    return (
      <div
        data-stage="unavailable"
        className="text-[11px]"
        style={{ backgroundColor: "#57534e", color: "#ffffff" }}
      >
        <div className="mx-auto flex h-8 max-w-7xl items-center gap-3 px-3 sm:px-6">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
            <span aria-hidden className="size-1.5 rounded-full bg-white/85" />
            Estágio indisponível
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-[10px] opacity-80 sm:block">
            A fonte oficial está indisponível. Acompanhe os canais oficiais.
          </span>
        </div>
      </div>
    );
  }

  const normalized = normalizeCityStage(stage.stage);
  const shortLabel = normalized
    ? CITY_STAGE_SHORT_LABELS[normalized]
    : "Dados indisponíveis";
  const description = normalized ? CITY_STAGE_DESCRIPTIONS[normalized] : "";
  const isManual = data?.stageStatus === "fallback";
  const darkText = normalized === "2" || normalized === "3";
  const foreground = darkText ? "#1f2937" : "#ffffff";
  const color = stage.color;
  const pillBackground = darkText
    ? "rgba(0,0,0,0.12)"
    : "rgba(255,255,255,0.18)";
  const effectiveAt = new Date(stage.effectiveAt);
  const effectiveText = Number.isNaN(effectiveAt.getTime())
    ? null
    : effectiveAt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

  return (
    <div
      data-stage={normalized ?? "unavailable"}
      className="text-[11px]"
      style={{ backgroundColor: color, color: foreground }}
    >
      <div className="mx-auto flex h-8 max-w-7xl items-center gap-3 px-3 sm:px-6">
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: pillBackground }}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: foreground, opacity: 0.85 }}
          />
          {stage.label} · {shortLabel}
        </span>
        <span
          className="hidden min-w-0 flex-1 truncate opacity-90 sm:block"
          title={description}
        >
          {stage.message || description}
        </span>
        <span className="hidden shrink-0 text-[10px] opacity-80 sm:inline">
          {isManual ? "fonte manual (admin)" : stage.sourceLabel}
          {effectiveText ? ` · vigente desde ${effectiveText}` : ""}
        </span>
      </div>
    </div>
  );
}
