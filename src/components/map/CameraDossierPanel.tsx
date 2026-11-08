"use client";

import { useState } from "react";
import { Camera as CameraIcon, X } from "lucide-react";
import { RainConditionSummary } from "./RainConditionCard";
import { CameraReportButton } from "./CameraReportButton";
import type {
  Camera,
  NeighborhoodCondition,
  NeighborhoodWithCount,
} from "@/lib/types";

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
      className={`absolute inset-x-0 bottom-0 z-20 flex h-[38dvh] min-h-56 max-h-[22rem] w-full flex-col border-t-2 bg-card pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[23rem] lg:border-l lg:border-t-0 lg:border-l-line ${
        open
          ? "translate-y-0 pointer-events-auto lg:translate-x-0"
          : "translate-y-[calc(100%_+_1rem)] pointer-events-none lg:translate-y-0 lg:translate-x-[calc(100%_+_1rem)]"
      }`}
      style={{ borderTopColor: "var(--stage-color, var(--theme-accent))" }}
      data-testid="camera-dossier-panel"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h3 className="font-editorial text-xl font-semibold leading-tight text-foreground">
            {neighborhood.name}
          </h3>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {neighborhood.regionName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar dossiê"
          className="grid size-7 shrink-0 place-items-center rounded-[2px] border border-line text-muted transition-colors hover:text-accent"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {condition ? (
          <div className="mb-4 hidden border-y border-line py-3 lg:block">
            <RainConditionSummary condition={condition} />
          </div>
        ) : conditionStatus === "loading" ? (
          <p className="mb-4 border-y border-line py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            Carregando chuva…
          </p>
        ) : conditionStatus === "error" ? (
          <p className="mb-4 border-y border-line py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            Sem dados de chuva no momento.
          </p>
        ) : null}
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
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
            <ul className="mt-2 divide-y divide-line/60">
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
                      className={`flex min-w-0 flex-1 items-start justify-between gap-3 py-2.5 text-left transition-colors ${
                        offline
                          ? "opacity-50 hover:opacity-70"
                          : "hover:text-accent"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={`flex items-center gap-1.5 truncate text-[11px] font-medium ${
                            offline ? "text-muted" : "text-foreground"
                          }`}
                          title={neighborhoodCamera.name}
                        >
                          <CameraIcon
                            aria-hidden
                            className="size-3 shrink-0 text-muted"
                          />
                          {neighborhoodCamera.name}
                        </span>
                      </span>
                      {offline ? (
                        <span className="mt-0.5 shrink-0 border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
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
            <p className="mt-4 border-y border-line py-2.5 text-[10px] leading-relaxed text-muted">
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
