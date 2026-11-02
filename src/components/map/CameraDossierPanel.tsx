"use client";

import { X } from "lucide-react";
import type { Camera, NeighborhoodWithCount } from "@/lib/types";

type CameraDossierPanelProps = {
  neighborhood: NeighborhoodWithCount;
  neighborhoodCameras: Camera[];
  open: boolean;
  onClose: () => void;
};

export function CameraDossierPanel({
  neighborhood,
  neighborhoodCameras,
  open,
  onClose,
}: CameraDossierPanelProps) {
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`absolute inset-x-0 bottom-0 z-20 flex h-[38dvh] min-h-56 max-h-[22rem] w-full flex-col rounded-t-2xl border-t border-line bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-y-4 lg:right-4 lg:left-auto lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[22rem] lg:rounded-2xl lg:border ${
        open
          ? "translate-y-0 pointer-events-auto lg:translate-x-0"
          : "translate-y-full pointer-events-none lg:translate-y-0 lg:translate-x-full"
      }`}
      data-testid="camera-dossier-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line/70 p-4">
        <div className="min-w-0">
          <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
            {neighborhood.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{neighborhood.regionName}</p>
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
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Câmeras disponíveis neste bairro
          </h4>
          {neighborhoodCameras.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {neighborhoodCameras.map((neighborhoodCamera) => (
                <li key={neighborhoodCamera.id}>
                  <a
                    href={neighborhoodCamera.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-line bg-card px-3 py-2 text-left transition-colors hover:border-brand/30 hover:text-brand"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-foreground">
                        {neighborhoodCamera.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted">
                        {neighborhoodCamera.providerName}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-muted">
              Nenhuma câmera cadastrada neste bairro.
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
