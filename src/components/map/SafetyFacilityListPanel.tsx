"use client";

import { useMemo, type ReactNode } from "react";
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
      className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-line bg-transparent text-muted hover:border-foreground/40 hover:text-foreground"
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
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; name: string; facilities: SafetyFacility[] }
    >();

    for (const facility of facilities) {
      const slug = facility.neighborhoodSlug ?? "__sem-bairro__";
      const name = facility.neighborhoodSlug
        ? (neighborhoodNameBySlug.get(facility.neighborhoodSlug) ??
          facility.neighborhoodSlug)
        : "Sem bairro";
      const existing = map.get(slug);
      if (existing) {
        existing.facilities.push(facility);
      } else {
        map.set(slug, { slug, name, facilities: [facility] });
      }
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [facilities, neighborhoodNameBySlug]);

  const showGroupHeaders = groups.length > 1;

  return (
    <div
      className="panel-enter absolute inset-x-0 bottom-0 z-20 flex h-[38dvh] min-h-56 max-h-[22rem] w-full flex-col border-t-2 bg-card pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[23rem] lg:border-l lg:border-t-0 lg:border-l-line"
      style={{ borderTopColor: "var(--stage-color, var(--theme-accent))" }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h3 className="font-editorial text-xl font-semibold leading-tight text-foreground">
            {title}
          </h3>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar ajuda"
          className="grid size-7 shrink-0 place-items-center rounded-[2px] border border-line text-muted transition-colors hover:text-accent"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line px-4 py-2.5">
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
          <p className="px-2 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            Carregando equipamentos…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="px-2 py-3 font-mono text-[9px] uppercase tracking-[0.1em] text-red-600 dark:text-red-300">
            Não foi possível carregar os equipamentos.
          </p>
        ) : null}
        {status === "ready" && facilities.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="grid size-9 place-items-center border border-line text-muted">
              <ShieldCheck aria-hidden className="size-4" />
            </span>
            <p className="font-editorial text-lg font-semibold text-foreground">
              Nenhum equipamento
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Ajuste o tipo ou selecione outro bairro.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.slug}>
                {showGroupHeaders ? (
                  <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
                    <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {group.name}
                    </h3>
                    <span className="font-mono text-[8px] tabular-nums text-muted">
                      {group.facilities.length}
                    </span>
                  </div>
                ) : null}
                <ul className="divide-y divide-line/60">
                  {group.facilities.map((facility) => {
                    const active = selectedId === facility.id;
                    return (
                      <li key={facility.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(facility)}
                          aria-pressed={active}
                          style={
                            active
                              ? {
                                  borderLeftColor:
                                    "var(--stage-color, var(--theme-accent))",
                                }
                              : undefined
                          }
                          className={`flex w-full items-center gap-2 border-l-2 py-2 pl-2 pr-2 text-left transition-colors ${
                            active
                              ? "text-foreground"
                              : "border-l-transparent text-foreground hover:border-l-line hover:text-accent"
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
                            <span className="block truncate text-[11px] font-medium">
                              {facility.name}
                            </span>
                            <span className="block truncate font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                              {SAFETY_FACILITY_KIND_SINGULAR[facility.kind]}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
