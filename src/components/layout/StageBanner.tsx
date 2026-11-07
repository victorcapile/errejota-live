"use client";

import { useEffect, useState } from "react";
import {
  CITY_STAGE_DESCRIPTIONS,
  CITY_STAGE_SHORT_LABELS,
  normalizeCityStage,
} from "@/lib/constants";
import type { CityStageStatus, CityStageView } from "@/lib/types";

type StageResponse = {
  stage: CityStageView;
  status: CityStageStatus;
  fetchedAt: string;
};

const REFRESH_MS = 60_000;

/**
 * Faixa do estágio operacional dentro do header. A cor é sempre a oficial do
 * COR-Rio; o modo avançado do mapa é derivado do estágio, não da faixa.
 */
export function StageBanner() {
  const [data, setData] = useState<StageResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/api/stage", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: StageResponse | null) => {
          if (!cancelled) {
            setData(payload);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData({
              stage: null,
              status: "unavailable",
              fetchedAt: new Date().toISOString(),
            });
          }
        });
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener("errejota:stage-updated", load);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("errejota:stage-updated", load);
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
  const isManual = data?.status === "fallback";
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
