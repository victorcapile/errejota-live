"use client";

import { useState } from "react";
import { Camera as CameraIcon, X } from "lucide-react";
import { RainConditionSummary } from "./RainConditionCard";
import { CameraReportButton } from "./CameraReportButton";
import {
  FLOOD_RISK_LEVEL_COLORS,
  FLOOD_RISK_LEVEL_LABELS,
  assessFloodRisk,
  floodRiskTitle,
} from "@/lib/flood-risk";
import type {
  Camera,
  NeighborhoodCondition,
  NeighborhoodWithCount,
} from "@/lib/types";

function RainRiskBadge({
  condition,
  status,
}: {
  condition?: NeighborhoodCondition | null;
  status?: "loading" | "ready" | "error";
}) {
  const assessment = condition
    ? assessFloodRisk(
        {
          mm1h: condition.rain1hMm,
          mm24h: condition.rain24hMm,
          mm96h: condition.rain96hMm,
        },
        condition.riskClass,
      )
    : null;
  const label =
    status === "loading" && !condition
      ? "carregando…"
      : assessment
        ? FLOOD_RISK_LEVEL_LABELS[assessment.level]
        : "dados indisponíveis";
  const color = assessment
    ? FLOOD_RISK_LEVEL_COLORS[assessment.level]
    : "#94a3b8";
  const title = assessment
    ? floodRiskTitle(assessment)
    : "Dados de chuva indisponíveis. Não é possível avaliar o risco de alagamento agora.";

  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-2 py-0.5 text-[9px] font-medium text-muted"
      title={title}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      Risco de alagamento:{" "}
      <strong className="font-semibold text-foreground">{label}</strong>
    </span>
  );
}

type CameraDossierPanelProps = {
  neighborhood: NeighborhoodWithCount;
  neighborhoodCameras: Camera[];
  open: boolean;
  onClose: () => void;
  onHoverCamera?: (camera: Camera | null) => void;
  condition?: NeighborhoodCondition | null;
  conditionStatus?: "loading" | "ready" | "error";
  statusFilter: "all" | "online" | "offline";
};

export function CameraDossierPanel({
  neighborhood,
  neighborhoodCameras,
  open,
  onClose,
  onHoverCamera,
  condition,
  conditionStatus,
  statusFilter,
}: CameraDossierPanelProps) {
  // O player do COR-Rio usa WebRTC com codecs que o Firefox desktop no macOS
  // não decodifica ("codecs not supported by client"). Como o Errejota só
  // abre o link oficial, avisamos o usuário do Firefox desktop.
  const [showFirefoxHint] = useState(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isFirefox = /Firefox\//.test(ua);
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    return isFirefox && !isMobile;
  });
  const onlineCount = neighborhoodCameras.filter(
    (camera) => camera.isOnline === true,
  ).length;
  const offlineCount = neighborhoodCameras.filter(
    (camera) => camera.isOnline === false,
  ).length;
  const unknownCount =
    neighborhoodCameras.length - onlineCount - offlineCount;

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`absolute inset-x-0 bottom-0 z-20 flex h-[38dvh] min-h-56 max-h-[22rem] w-full flex-col rounded-t-2xl border-t border-line bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-y-4 lg:right-4 lg:left-auto lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[24rem] lg:rounded-2xl lg:border ${
        open
          ? "translate-y-0 pointer-events-auto lg:translate-x-0"
          : "translate-y-[calc(100%_+_1rem)] pointer-events-none lg:translate-y-0 lg:translate-x-[calc(100%_+_1rem)]"
      }`}
      data-testid="camera-dossier-panel"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {neighborhood.name}
            <span className="ml-1.5 text-xs font-normal text-muted">
              · {neighborhood.regionName}
            </span>
          </h3>
          <RainRiskBadge condition={condition} status={conditionStatus} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar dossiê"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-brand"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {condition ? (
          <div className="mb-3 hidden rounded-lg border border-line bg-card/60 px-2.5 py-2 lg:block">
            <RainConditionSummary condition={condition} />
          </div>
        ) : conditionStatus === "loading" ? (
          <p className="mb-3 rounded-lg border border-line bg-card/60 px-2.5 py-1.5 text-[10px] text-muted">
            Carregando chuva…
          </p>
        ) : conditionStatus === "error" ? (
          <p className="mb-3 rounded-lg border border-line bg-card/60 px-2.5 py-1.5 text-[10px] text-muted">
            Sem dados de chuva no momento.
          </p>
        ) : null}
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Câmeras neste bairro
            </h4>
            {onlineCount + offlineCount > 0 ? (
              <p className="shrink-0 text-[10px] tabular-nums text-muted">
                {statusFilter === "online" ? (
                  <>{onlineCount} online</>
                ) : statusFilter === "offline" ? (
                  <>{offlineCount} offline</>
                ) : (
                  <>
                    {onlineCount} online
                    {offlineCount > 0 ? ` · ${offlineCount} offline` : ""}
                    {unknownCount > 0 ? ` · ${unknownCount} sem status` : ""}
                  </>
                )}
              </p>
            ) : null}
          </div>
          {neighborhoodCameras.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {neighborhoodCameras.map((neighborhoodCamera) => {
                const offline = neighborhoodCamera.isOnline === false;
                return (
                  <li
                    key={neighborhoodCamera.id}
                    className="flex items-center gap-2"
                    onMouseEnter={() => onHoverCamera?.(neighborhoodCamera)}
                    onMouseLeave={() => onHoverCamera?.(null)}
                    onFocus={() => onHoverCamera?.(neighborhoodCamera)}
                    onBlur={() => onHoverCamera?.(null)}
                  >
                    <a
                      href={neighborhoodCamera.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        offline
                          ? "Câmera offline no provedor"
                          : "Abrir página oficial da câmera"
                      }
                      className={`flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        offline
                          ? "border-line/60 bg-card/40 opacity-60 grayscale hover:opacity-80"
                          : "border-line bg-card hover:border-brand/30 hover:text-brand"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={`flex items-center gap-1.5 truncate text-[11px] font-medium ${
                            offline ? "text-muted" : "text-foreground"
                          }`}
                        >
                          <CameraIcon
                            aria-hidden
                            className="size-3 shrink-0 text-muted"
                          />
                          {neighborhoodCamera.name}
                        </span>
                      </span>
                      {offline ? (
                        <span className="mt-0.5 shrink-0 rounded-full border border-line bg-background px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                          offline
                        </span>
                      ) : null}
                    </a>
                    <CameraReportButton camera={neighborhoodCamera} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-muted">
              Nenhuma câmera com os filtros atuais neste bairro.
            </p>
          )}
          {showFirefoxHint ? (
            <p className="mt-4 rounded-lg border border-line bg-card/60 p-2.5 text-[10px] leading-relaxed text-muted">
              No Firefox desktop, algumas câmeras do COR-Rio podem não abrir por
              falta de codec de vídeo (“codecs not supported by client”). Se isso
              acontecer, abra o link no Chrome ou no Safari.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
