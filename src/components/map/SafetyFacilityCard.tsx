"use client";

import { ExternalLink, X } from "lucide-react";
import {
  SAFETY_FACILITY_KIND_COLORS,
  SAFETY_FACILITY_KIND_SINGULAR,
} from "@/lib/constants";
import type { SafetyFacility } from "@/lib/safety";

function formatDateTime(iso: string | null): string {
  if (!iso) return "data não informada";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "data não informada";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

function coordinateSourceLabel(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { coordinateSource?: unknown };
    if (parsed.coordinateSource === "data-rio") return "Data.Rio";
    if (parsed.coordinateSource === "nominatim") {
      return "OpenStreetMap (Nominatim)";
    }
  } catch {
    // metadata inválida: ignora.
  }
  return null;
}

export function SafetyFacilityCard({
  facility,
  neighborhoodName,
  onClose,
}: {
  facility: SafetyFacility;
  neighborhoodName?: string | null;
  onClose: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`;
  const color = SAFETY_FACILITY_KIND_COLORS[facility.kind];
  const coordinates = coordinateSourceLabel(facility.metadata);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white"
            style={{ backgroundColor: color }}
          >
            {SAFETY_FACILITY_KIND_SINGULAR[facility.kind]}
          </span>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
            {facility.name}
          </h3>
          {facility.address ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              {facility.address}
            </p>
          ) : null}
          {facility.neighborhoodSlug ? (
            <p className="text-[10px] text-muted">
              {neighborhoodName ?? facility.neighborhoodSlug}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar equipamento"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-brand"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <dl className="space-y-1.5 text-[11px] leading-relaxed">
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              Fonte
            </dt>
            <dd className="text-foreground">{facility.sourceLabel}</dd>
          </div>
          {coordinates ? (
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                Coordenadas
              </dt>
              <dd className="text-foreground">{coordinates}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              Atualização da fonte
            </dt>
            <dd className="text-foreground">
              {formatDateTime(facility.sourceUpdatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              Sincronizado em
            </dt>
            <dd className="text-foreground">
              {formatDateTime(facility.syncedAt)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          {facility.attribution}
        </p>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          Abrir no Google Maps
        </a>
      </div>
    </div>
  );
}
