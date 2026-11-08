"use client";

import type { ReactNode } from "react";
import { ExternalLink, Phone, X } from "lucide-react";
import {
  SAFETY_FACILITY_KIND_COLORS,
  SAFETY_FACILITY_KIND_SINGULAR,
} from "@/lib/constants";
import type { SafetyFacility } from "@/lib/safety";

type FacilityMeta = {
  coordinateSource?: unknown;
  type?: unknown;
  phone?: unknown;
  turnoAtendimento?: unknown;
  community?: unknown;
  reference?: unknown;
  mainPoint?: unknown;
  link?: unknown;
};

function parseMetadata(metadata: string | null): FacilityMeta {
  if (!metadata) {
    return {};
  }
  try {
    return JSON.parse(metadata) as FacilityMeta;
  } catch {
    return {};
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "não informada";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "não informada";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

function coordinateSourceLabel(source: unknown): string | null {
  if (source === "data-rio") return "Data.Rio";
  if (source === "nominatim") return "OpenStreetMap";
  return null;
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-mono text-[10px] leading-snug text-foreground">
        {children}
      </dd>
    </div>
  );
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
  const meta = parseMetadata(facility.metadata);
  const coordinates = coordinateSourceLabel(meta.coordinateSource);
  const type = text(meta.type);
  const phone = text(meta.phone);
  const turno = text(meta.turnoAtendimento);
  const community = text(meta.community);
  const reference = text(meta.reference);
  const mainPoint = text(meta.mainPoint);
  const link = text(meta.link);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-white"
              style={{ backgroundColor: color }}
            >
              {SAFETY_FACILITY_KIND_SINGULAR[facility.kind]}
            </span>
            {neighborhoodName ? (
              <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                {neighborhoodName}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 font-editorial text-xl font-semibold leading-tight text-foreground">
            {facility.name}
          </h3>
          {facility.address ? (
            <p className="mt-1 text-[10px] leading-snug text-muted">
              {facility.address}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar equipamento"
          className="grid size-7 shrink-0 place-items-center rounded-[2px] border border-line text-muted transition-colors hover:text-accent"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {type ? <InfoItem label="Tipo">{type}</InfoItem> : null}
          {phone ? (
            <InfoItem label="Telefone">
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1 text-foreground hover:text-accent"
              >
                <Phone aria-hidden className="size-3" />
                {phone}
              </a>
            </InfoItem>
          ) : null}
          {turno ? <InfoItem label="Atendimento">{turno}</InfoItem> : null}
          {community ? <InfoItem label="Comunidade">{community}</InfoItem> : null}
          {reference ? <InfoItem label="Referência">{reference}</InfoItem> : null}
          {mainPoint ? <InfoItem label="Ponto">{mainPoint}</InfoItem> : null}
          <InfoItem label="Fonte">{facility.sourceLabel}</InfoItem>
          {coordinates ? (
            <InfoItem label="Coordenadas">{coordinates}</InfoItem>
          ) : null}
          <InfoItem label="Atualização da fonte">
            {formatDateTime(facility.sourceUpdatedAt)}
          </InfoItem>
          <InfoItem label="Sincronizado em">
            {formatDateTime(facility.syncedAt)}
          </InfoItem>
        </dl>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-foreground hover:text-accent"
          >
            <ExternalLink aria-hidden className="size-3" />
            Ver referência do abrigo
          </a>
        ) : null}

        <p className="mt-3 text-[9px] leading-relaxed text-muted">
          {facility.attribution}
        </p>
      </div>

      <div className="shrink-0 border-t border-line px-4 py-2.5">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 border border-foreground bg-foreground font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          Abrir no Google Maps
        </a>
      </div>
    </div>
  );
}
