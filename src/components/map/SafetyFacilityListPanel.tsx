"use client";

import type { ReactNode } from "react";
import { ShieldCheck, X } from "lucide-react";
import {
  SAFETY_FACILITY_KIND_COLORS,
  SAFETY_FACILITY_KIND_LABELS,
  SAFETY_FACILITY_KIND_SINGULAR,
  SAFETY_FACILITY_KIND_VALUES,
  type SafetyFacilityKind,
} from "@/lib/constants";
import type { SafetyFacility } from "@/lib/safety";

type SafetyFacilityListPanelProps = {
  title: string;
  subtitle: string;
  facilities: SafetyFacility[];
  kind: SafetyFacilityKind | "all";
  onKindChange: (kind: SafetyFacilityKind | "all") => void;
  counts: Record<SafetyFacilityKind | "all", number>;
  status: "idle" | "loading" | "ready" | "error";
  selectedId: string | null;
  onSelect: (facility: SafetyFacility) => void;
  onClose: () => void;
  neighborhoodNameBySlug: Map<string, string>;
};

function KindChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
        active
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-line bg-card text-muted hover:border-brand/30 hover:text-brand"
      }`}
    >
      {children}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

export function SafetyFacilityListPanel({
  title,
  subtitle,
  facilities,
  kind,
  onKindChange,
  counts,
  status,
  selectedId,
  onSelect,
  onClose,
  neighborhoodNameBySlug,
}: SafetyFacilityListPanelProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[38dvh] min-h-56 max-h-[22rem] w-full flex-col rounded-t-2xl border-t border-line bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl lg:inset-y-4 lg:right-4 lg:left-auto lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[24rem] lg:rounded-2xl lg:border">
      <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar ajuda"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-brand"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line/70 px-4 py-2.5">
        <KindChip
          active={kind === "all"}
          count={counts.all}
          onClick={() => onKindChange("all")}
        >
          Todos
        </KindChip>
        {SAFETY_FACILITY_KIND_VALUES.map((value) => (
          <KindChip
            key={value}
            active={kind === value}
            count={counts[value]}
            onClick={() => onKindChange(value)}
          >
            {SAFETY_FACILITY_KIND_LABELS[value]}
          </KindChip>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {status === "loading" ? (
          <p className="px-2 py-3 text-[11px] text-muted">
            Carregando equipamentos…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="px-2 py-3 text-[11px] text-red-600 dark:text-red-300">
            Não foi possível carregar os equipamentos.
          </p>
        ) : null}
        {status === "ready" && facilities.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="grid size-10 place-items-center rounded-xl border border-line/70 bg-card text-muted">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">
              Nenhum equipamento
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Ajuste o tipo ou selecione outro bairro.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {facilities.map((facility) => {
              const active = selectedId === facility.id;
              const neighborhoodName = facility.neighborhoodSlug
                ? (neighborhoodNameBySlug.get(facility.neighborhoodSlug) ??
                  facility.neighborhoodSlug)
                : null;
              return (
                <li key={facility.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(facility)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-foreground hover:bg-background"
                    }`}
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 10 10"
                      className="size-2.5 shrink-0"
                    >
                      <path
                        d="M5 0.8 9.4 9.2H0.6Z"
                        fill={SAFETY_FACILITY_KIND_COLORS[facility.kind]}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {facility.name}
                      </span>
                      <span
                        className={`block truncate text-[10px] ${
                          active ? "text-brand/80" : "text-muted"
                        }`}
                      >
                        {SAFETY_FACILITY_KIND_SINGULAR[facility.kind]}
                        {neighborhoodName ? ` · ${neighborhoodName}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
