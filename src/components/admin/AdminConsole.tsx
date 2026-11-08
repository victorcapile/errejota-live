"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  CloudOff,
  CloudRain,
  Flag,
  Gauge,
  History,
  Inbox,
  ListChecks,
  Loader2,
  MousePointerClick,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { AdminCamera, ManualStageView } from "@/lib/admin-data";
import type { CriticalModeView } from "@/lib/critical-mode";
import {
  CAMERA_REPORT_REASON_LABELS,
  CAMERA_REPORT_REASON_VALUES,
  CAMERA_REPORT_STATUS_LABELS,
  CAMERA_REPORT_STATUS_VALUES,
  CITY_STAGE_LABELS,
  CITY_STAGE_SHORT_LABELS,
  cameraReportReasonLabel,
  type CameraReportReason,
  type CameraReportStatus,
} from "@/lib/constants";
import type { IngestRunSummary } from "@/lib/rain";
import type { CameraReportSummary, ReportCounts } from "@/lib/reports";
import type {
  CityStageStatus,
  CityStageView,
  RainStationLatest,
} from "@/lib/types";

type Overview = {
  reports: CameraReportSummary[];
  counts: ReportCounts;
  cameraSummary: {
    total: number;
    online: number;
    offline: number;
    unknown: number;
  };
  cameras: AdminCamera[];
  stage: {
    stage: CityStageView;
    status: CityStageStatus;
    fetchedAt: string;
  };
  criticalMode: CriticalModeView;
  manualStages: ManualStageView[];
  rain: { updatedAt: string | null; items: RainStationLatest[] };
  lastRainRun: IngestRunSummary | null;
  audit: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    detail: string | null;
    actor: string;
    createdAt: string;
  }>;
};

type Tab = "moderation" | "cameras" | "stage" | "rain" | "audit";

const TABS: Array<{ id: Tab; label: string; icon: typeof Flag }> = [
  { id: "moderation", label: "Moderação", icon: Flag },
  { id: "cameras", label: "Câmeras", icon: Camera },
  { id: "stage", label: "Estágio", icon: Gauge },
  { id: "rain", label: "Chuva", icon: CloudRain },
  { id: "audit", label: "Auditoria", icon: ListChecks },
];

const fieldClass =
  "h-9 rounded-[2px] border border-line bg-background px-2.5 font-mono text-[10px] text-foreground outline-none transition-colors focus:border-accent";

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatMm(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR")} mm`;
}

function reportStatusClass(status: CameraReportStatus): string {
  if (status === "pending") return "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "approved") return "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "rejected") return "border-red-300/50 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "resolved") return "border-accent/40 bg-accent/10 text-accent";
  return "border-line bg-background text-muted";
}

function cameraStatusClass(isOnline: boolean | null): string {
  if (isOnline === true) return "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (isOnline === false) return "border-red-300/50 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-line bg-background text-muted";
}

function cameraStatusLabel(isOnline: boolean | null): string {
  if (isOnline === true) return "Online";
  if (isOnline === false) return "Offline";
  return "Desconhecido";
}

function CountCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "pending" | "approved" | "rejected" | "resolved";
}) {
  const toneClass =
    tone === "pending"
      ? "border-amber-300/50 bg-amber-500/5"
      : tone === "approved"
        ? "border-emerald-300/50 bg-emerald-500/5"
        : tone === "rejected"
          ? "border-red-300/50 bg-red-500/5"
          : tone === "resolved"
            ? "border-accent/40 bg-accent/5"
            : "border-line bg-card";
  return (
    <div className={`border p-3 ${toneClass}`}>
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-editorial text-2xl font-semibold tabular-nums tracking-tight">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-line bg-card p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-editorial text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-3 flex min-h-52 flex-1 flex-col items-center justify-center gap-2 border border-dashed border-line bg-background/40 px-6 py-8 text-center">
      <span className="grid size-9 place-items-center border border-line bg-card text-muted">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("moderation");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [reportStatus, setReportStatus] = useState<
    CameraReportStatus | "all"
  >("pending");
  const [reportReason, setReportReason] = useState<
    CameraReportReason | "all"
  >("all");
  const [query, setQuery] = useState("");
  const [cameraStatus, setCameraStatus] = useState<
    "all" | "online" | "offline" | "unknown"
  >("all");

  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    null,
  );
  const [moderationNote, setModerationNote] = useState("");
  const [applyStatus, setApplyStatus] = useState<
    "none" | "online" | "offline" | "unknown"
  >("none");

  const [stageForm, setStageForm] = useState({
    stage: "1",
    message: "",
    sourceLabel: "Atualização manual (admin)",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: reportStatus,
        reason: reportReason,
        cameraStatus,
      });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/overview?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as Overview;
      setOverview(payload);
    } catch {
      setError("Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [reportStatus, reportReason, cameraStatus, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedReport = useMemo(
    () =>
      overview?.reports.find((report) => report.id === selectedReportId) ??
      null,
    [overview?.reports, selectedReportId],
  );

  async function runAction(body: Record<string, unknown>) {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      setActionMessage("Ação aplicada.");
      window.dispatchEvent(new Event("errejota:stage-updated"));
      await load();
    } catch (actionError) {
      setActionMessage(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível aplicar a ação.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  function selectReport(report: CameraReportSummary) {
    setSelectedReportId(report.id);
    setModerationNote(report.moderationNote ?? "");
    setApplyStatus("none");
    setActionMessage(null);
  }

  function moderate(action: "approve" | "reject" | "resolve" | "duplicate") {
    if (!selectedReport) return;
    void runAction({
      type: "moderate_report",
      id: selectedReport.id,
      action,
      note: moderationNote,
      applyStatus: action === "approve" && applyStatus !== "none" ? applyStatus : null,
    });
  }

  const counts = overview?.counts;
  const stage = overview?.stage.stage ?? null;
  const stageStatus = overview?.stage.status ?? "unavailable";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-[1400px] flex-col px-3 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted">
            Errejota · administração
          </p>
          <h1 className="mt-2 font-editorial text-3xl font-semibold tracking-tight">
            Moderação e operação
          </h1>
          <p className="mt-1 text-xs text-muted">
            Fila de relatos, status das câmeras, estágio e chuva em um só lugar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 border border-line px-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted transition-colors hover:border-foreground/40 hover:text-accent disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden
            className={`size-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden className="size-3.5" />
              {item.label}
              {item.id === "moderation" && counts ? (
                <span
                  className={`rounded-[2px] px-1.5 py-0.5 text-[8px] font-semibold ${
                    active
                      ? "bg-foreground text-background"
                      : "border border-line text-muted"
                  }`}
                >
                  {counts.pending}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {error ? (
        <p className="mt-4 border border-red-300/50 bg-red-500/10 px-4 py-3 font-mono text-[10px] text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="mt-4 border border-line bg-card px-4 py-2 font-mono text-[10px] text-muted">
          {actionMessage}
        </p>
      ) : null}

      {loading && !overview ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Carregando painel…
        </div>
      ) : null}

      {overview ? (
        <div className="mt-5 flex flex-1 flex-col">
          {tab === "moderation" ? (
            <div className="flex flex-1 flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <CountCard
                  label="Pendentes"
                  value={overview.counts.pending}
                  tone="pending"
                />
                <CountCard
                  label="Aprovados"
                  value={overview.counts.approved}
                  tone="approved"
                />
                <CountCard
                  label="Rejeitados"
                  value={overview.counts.rejected}
                  tone="rejected"
                />
                <CountCard
                  label="Resolvidos"
                  value={overview.counts.resolved}
                  tone="resolved"
                />
                <CountCard
                  label="Duplicados"
                  value={overview.counts.duplicate}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reportStatus}
                  onChange={(event) =>
                    setReportStatus(
                      event.target.value as CameraReportStatus | "all",
                    )
                  }
                  className={fieldClass}
                  aria-label="Filtrar relatos por status"
                >
                  <option value="pending">Pendentes</option>
                  <option value="all">Todos os status</option>
                  {CAMERA_REPORT_STATUS_VALUES.filter(
                    (status) => status !== "pending",
                  ).map((status) => (
                    <option key={status} value={status}>
                      {CAMERA_REPORT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <select
                  value={reportReason}
                  onChange={(event) =>
                    setReportReason(
                      event.target.value as CameraReportReason | "all",
                    )
                  }
                  className={fieldClass}
                  aria-label="Filtrar relatos por motivo"
                >
                  <option value="all">Todos os motivos</option>
                  {CAMERA_REPORT_REASON_VALUES.map((reason) => (
                    <option key={reason} value={reason}>
                      {CAMERA_REPORT_REASON_LABELS[reason]}
                    </option>
                  ))}
                </select>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar câmera ou ID…"
                  className={`${fieldClass} min-w-48 flex-1`}
                  aria-label="Buscar câmera"
                />
              </div>

              <div className="grid flex-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <Panel title="Fila de relatos" className="flex flex-col">
                  {overview.reports.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="Nenhum relato"
                      description="Ajuste os filtros ou aguarde novos relatos de câmeras."
                    />
                  ) : (
                    <ul className="mt-3 min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">
                      {overview.reports.map((report) => (
                        <li key={report.id}>
                          <button
                            type="button"
                            onClick={() => selectReport(report)}
                            className={`flex w-full items-start justify-between gap-3 py-2.5 text-left transition-colors ${
                              selectedReportId === report.id
                                ? "text-accent"
                                : "text-foreground hover:text-accent"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">
                                {report.cameraName}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] text-muted">
                                {cameraReportReasonLabel(report.reason)} ·{" "}
                                {formatDateTime(report.createdAt)}
                              </span>
                              {report.note ? (
                                <span className="mt-1 block line-clamp-2 text-[10px] text-muted">
                                  “{report.note}”
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={`shrink-0 rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold ${reportStatusClass(
                                report.status,
                              )}`}
                            >
                              {CAMERA_REPORT_STATUS_LABELS[report.status]}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Detalhe do relato" className="flex flex-col">
                  {!selectedReport ? (
                    <EmptyState
                      icon={MousePointerClick}
                      title="Selecione um relato"
                      description="Escolha um item da fila para ver os detalhes e moderar."
                    />
                  ) : (
                    <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
                      <div>
                        <p className="text-sm font-semibold">
                          {selectedReport.cameraName}
                        </p>
                        <p className="text-[10px] text-muted">
                          {selectedReport.cameraExternalId ?? "sem ID externo"}{" "}
                          · {formatDateTime(selectedReport.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span
                          className={`rounded-[2px] border px-2 py-0.5 font-semibold ${reportStatusClass(
                            selectedReport.status,
                          )}`}
                        >
                          {CAMERA_REPORT_STATUS_LABELS[selectedReport.status]}
                        </span>
                        <span className="rounded-[2px] border border-line bg-background px-2 py-0.5 text-muted">
                          {cameraReportReasonLabel(selectedReport.reason)}
                        </span>
                      </div>
                      {selectedReport.note ? (
                        <p className="rounded-[2px] border border-line/70 bg-background/60 p-2.5 text-xs leading-relaxed text-muted">
                          {selectedReport.note}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">
                          Sem observação do usuário.
                        </p>
                      )}

                      <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                        Nota da moderação
                        <textarea
                          value={moderationNote}
                          onChange={(event) =>
                            setModerationNote(event.target.value)
                          }
                          rows={2}
                          maxLength={500}
                          className="mt-1 w-full rounded-[2px] border border-line bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
                          placeholder="Opcional"
                        />
                      </label>

                      <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                        Ao aprovar, aplicar status
                        <select
                          value={applyStatus}
                          onChange={(event) =>
                            setApplyStatus(
                              event.target.value as
                                | "none"
                                | "online"
                                | "offline"
                                | "unknown",
                            )
                          }
                          className={`${fieldClass} mt-1 w-full`}
                        >
                          <option value="none">Não alterar a câmera</option>
                          <option value="online">Marcar online</option>
                          <option value="offline">Marcar offline</option>
                          <option value="unknown">Limpar status</option>
                        </select>
                      </label>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => moderate("approve")}
                          disabled={actionBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-[2px] bg-emerald-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 aria-hidden className="size-3.5" />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => moderate("reject")}
                          disabled={actionBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-red-300/50 bg-red-500/10 px-2.5 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-300"
                        >
                          <XCircle aria-hidden className="size-3.5" />
                          Rejeitar
                        </button>
                        <button
                          type="button"
                          onClick={() => moderate("resolve")}
                          disabled={actionBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-accent/40 bg-accent/10 px-2.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                        >
                          <CheckCircle2 aria-hidden className="size-3.5" />
                          Resolver
                        </button>
                        <button
                          type="button"
                          onClick={() => moderate("duplicate")}
                          disabled={actionBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-line bg-background px-2.5 text-[11px] font-medium text-muted transition-colors hover:text-accent disabled:opacity-50"
                        >
                          <Flag aria-hidden className="size-3.5" />
                          Duplicado
                        </button>
                      </div>
                      {selectedReport.moderatedAt ? (
                        <p className="text-[10px] text-muted">
                          Moderado em {formatDateTime(selectedReport.moderatedAt)}
                          {selectedReport.moderatedBy
                            ? ` por ${selectedReport.moderatedBy}`
                            : ""}
                          .
                        </p>
                      ) : null}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          ) : null}

          {tab === "cameras" ? (
            <div className="flex flex-1 flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CountCard
                  label="Total"
                  value={overview.cameraSummary.total}
                />
                <CountCard
                  label="Online"
                  value={overview.cameraSummary.online}
                  tone="approved"
                />
                <CountCard
                  label="Offline"
                  value={overview.cameraSummary.offline}
                  tone="rejected"
                />
                <CountCard
                  label="Desconhecido"
                  value={overview.cameraSummary.unknown}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar câmera, ID ou bairro…"
                  className={`${fieldClass} min-w-48 flex-1`}
                  aria-label="Buscar câmera"
                />
                <select
                  value={cameraStatus}
                  onChange={(event) =>
                    setCameraStatus(
                      event.target.value as
                        | "all"
                        | "online"
                        | "offline"
                        | "unknown",
                    )
                  }
                  className={fieldClass}
                  aria-label="Filtrar câmeras por status"
                >
                  <option value="all">Todos os status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unknown">Desconhecido</option>
                </select>
              </div>

              <Panel
                title={`Câmeras (${formatNumber(overview.cameras.length)})`}
                className="flex flex-col"
                actions={
                  <div className="flex items-center gap-1.5">
                    <select
                      id="bulk-camera-status"
                      defaultValue="online"
                      className={fieldClass}
                      aria-label="Status para aplicar em lote"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="unknown">Desconhecido</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.getElementById(
                          "bulk-camera-status",
                        ) as HTMLSelectElement | null;
                        const status = element?.value ?? "online";
                        if (
                          window.confirm(
                            `Aplicar "${status}" a TODAS as câmeras?`,
                          )
                        ) {
                          void runAction({
                            type: "set_all_cameras",
                            status,
                          });
                        }
                      }}
                      disabled={actionBusy}
                      className="h-9 rounded-[2px] border border-line bg-background px-2.5 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
                    >
                      Aplicar em lote
                    </button>
                  </div>
                }
              >
                {overview.cameras.length === 0 ? (
                  <EmptyState
                    icon={CameraOff}
                    title="Nenhuma câmera"
                    description="Ajuste a busca ou o filtro de status para encontrar câmeras."
                  />
                ) : (
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                    <ul className="divide-y divide-line/60">
                    {overview.cameras.map((camera) => (
                      <li
                        key={camera.id}
                        className="flex flex-wrap items-center gap-2 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {camera.name}
                          </p>
                          <p className="truncate text-[10px] text-muted">
                            {camera.externalId}
                            {camera.neighborhoodSlug
                              ? ` · ${camera.neighborhoodSlug}`
                              : ""}
                            {" · "}
                            {formatDateTime(camera.updatedAt)}
                          </p>
                        </div>
                        <span
                          className={`rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold ${cameraStatusClass(
                            camera.isOnline,
                          )}`}
                        >
                          {cameraStatusLabel(camera.isOnline)}
                        </span>
                        <div className="flex gap-1">
                          {(["online", "offline", "unknown"] as const).map(
                            (status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  void runAction({
                                    type: "set_camera_status",
                                    externalId: camera.externalId,
                                    status,
                                  })
                                }
                                disabled={actionBusy}
                                className="rounded-[2px] border border-line bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
                              >
                                {status === "online"
                                  ? "Online"
                                  : status === "offline"
                                    ? "Offline"
                                    : "Limpar"}
                              </button>
                            ),
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                )}
              </Panel>
            </div>
          ) : null}

          {tab === "stage" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Estágio atual">
                {!stage ? (
                  <EmptyState
                    icon={CloudOff}
                    title="Dados indisponíveis"
                    description="O COR-Rio não respondeu e não há override manual."
                  />
                ) : (
                  <div className="mt-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-[2px] px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: stage.color,
                        color:
                          stage.stage === "2" || stage.stage === "3"
                            ? "#1f2937"
                            : "#ffffff",
                      }}
                    >
                      {stage.label} · {CITY_STAGE_SHORT_LABELS[stage.stage]}
                    </div>
                    <p className="mt-3 text-sm text-muted">
                      {stage.message || "Sem mensagem adicional."}
                    </p>
                    <p className="mt-2 text-[10px] text-muted">
                      {stageStatus === "fallback"
                        ? "Fonte manual (admin)"
                        : stage.sourceLabel}{" "}
                      · vigente desde {formatDateTime(stage.effectiveAt)}
                    </p>
                  </div>
                )}
              </Panel>

              <Panel title="Modo avançado">
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold ${
                      overview.criticalMode.active
                        ? "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-line bg-background text-muted"
                    }`}
                  >
                    {overview.criticalMode.active ? "Ativo" : "Inativo"}
                  </span>
                  {overview.criticalMode.since ? (
                    <span className="text-[10px] text-muted">
                      desde {formatDateTime(overview.criticalMode.since)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  Ativado automaticamente quando a cidade chega ao estágio 3.
                  Liga chuva, risco por bairro e ajuda, e desliga as câmeras.
                  Volta ao normal quando o estágio fica abaixo de 3.
                </p>
              </Panel>

              <Panel title="Override manual">
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Quando definido, este estágio substitui o COR-Rio no banner e
                  no modo avançado até ser removido.
                </p>
                {stageStatus === "fallback" ? (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-[2px] border border-amber-300/60 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    Override ativo
                  </p>
                ) : null}
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAction({
                      type: "set_stage",
                      stage: stageForm.stage,
                      message: stageForm.message,
                      sourceLabel: stageForm.sourceLabel,
                    });
                  }}
                >
                  <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                    Estágio
                    <select
                      value={stageForm.stage}
                      onChange={(event) =>
                        setStageForm((current) => ({
                          ...current,
                          stage: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-1 w-full`}
                    >
                      {(["1", "2", "3", "4", "5"] as const).map((value) => (
                        <option key={value} value={value}>
                          {CITY_STAGE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                    Mensagem
                    <input
                      value={stageForm.message}
                      onChange={(event) =>
                        setStageForm((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      maxLength={300}
                      className={`${fieldClass} mt-1 w-full`}
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
                    Fonte
                    <input
                      value={stageForm.sourceLabel}
                      onChange={(event) =>
                        setStageForm((current) => ({
                          ...current,
                          sourceLabel: event.target.value,
                        }))
                      }
                      maxLength={120}
                      className={`${fieldClass} mt-1 w-full`}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={actionBusy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[2px] bg-foreground px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-background transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <ShieldAlert aria-hidden className="size-3.5" />
                      Salvar override
                    </button>
                    {stageStatus === "fallback" ? (
                      <button
                        type="button"
                        onClick={() => void runAction({ type: "clear_stage" })}
                        disabled={actionBusy}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-line bg-background px-3 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
                      >
                        Voltar ao COR-Rio
                      </button>
                    ) : null}
                  </div>
                </form>
              </Panel>

              <Panel title="Últimos overrides">
                {overview.manualStages.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="Nenhum override"
                    description="Overrides manuais de estágio aparecerão aqui."
                  />
                ) : (
                  <ul className="mt-3 divide-y divide-line/60">
                    {overview.manualStages.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-2 text-xs"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{item.label}</span>
                          {item.message ? (
                            <span className="block truncate text-[10px] text-muted">
                              {item.message}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted">
                          {formatDateTime(item.effectiveAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          ) : null}

          {tab === "rain" ? (
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <Panel title="Última ingestão">
                {!overview.lastRainRun ? (
                  <EmptyState
                    icon={CloudRain}
                    title="Nenhuma execução"
                    description="A ingestão de chuva ainda não registrou execuções."
                  />
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        Status
                      </p>
                      <p className="font-medium">{overview.lastRainRun.status}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        Início
                      </p>
                      <p className="font-medium">
                        {formatDateTime(overview.lastRainRun.startedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        Itens
                      </p>
                      <p className="font-medium">
                        {formatNumber(overview.lastRainRun.itemsProcessed)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                        Leitura
                      </p>
                      <p className="font-medium">
                        {formatDateTime(overview.rain.updatedAt)}
                      </p>
                    </div>
                    {overview.lastRainRun.errorMessage ? (
                      <p className="col-span-2 text-red-700 dark:text-red-300">
                        {overview.lastRainRun.errorMessage}
                      </p>
                    ) : null}
                  </div>
                )}
              </Panel>

              <Panel
                title={`Estações (${formatNumber(overview.rain.items.length)})`}
              >
                {overview.rain.items.length === 0 ? (
                  <EmptyState
                    icon={CloudRain}
                    title="Nenhuma estação"
                    description="Ainda não há leituras de chuva sincronizadas."
                  />
                ) : (
                  <div className="mt-3 max-h-[32rem] overflow-auto">
                    <table className="w-full min-w-[34rem] text-left text-xs">
                      <thead className="sticky top-0 bg-card text-[9px] uppercase tracking-[0.12em] text-muted">
                        <tr className="border-b border-line/60">
                          <th className="py-1.5 pr-2">Estação</th>
                          <th className="py-1.5 pr-2">1h</th>
                          <th className="py-1.5 pr-2">24h</th>
                          <th className="py-1.5 pr-2">96h</th>
                          <th className="py-1.5">Leitura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.rain.items.map((station) => (
                          <tr
                            key={station.id}
                            className="border-b border-line/40"
                          >
                            <td className="py-1.5 pr-2">
                              {station.name}
                              {station.neighborhoodSlug ? (
                                <span className="block text-[9px] text-muted">
                                  {station.neighborhoodSlug}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-1.5 pr-2 tabular-nums">
                              {formatMm(station.metrics.mm_1h ?? null)}
                            </td>
                            <td className="py-1.5 pr-2 tabular-nums">
                              {formatMm(station.metrics.mm_24h ?? null)}
                            </td>
                            <td className="py-1.5 pr-2 tabular-nums">
                              {formatMm(station.metrics.mm_96h ?? null)}
                            </td>
                            <td className="py-1.5 text-[10px] text-muted">
                              {formatDateTime(station.readingAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          ) : null}

          {tab === "audit" ? (
            <Panel title="Ações recentes" className="flex flex-1 flex-col">
              {overview.audit.length === 0 ? (
                <EmptyState
                  icon={ScrollText}
                  title="Nenhuma ação"
                  description="Ações administrativas de moderação e operação aparecerão aqui."
                />
              ) : (
                <div className="mt-3 min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[36rem] text-left text-xs">
                    <thead className="text-[9px] uppercase tracking-[0.12em] text-muted">
                      <tr className="border-b border-line/60">
                        <th className="py-1.5 pr-3">Ação</th>
                        <th className="py-1.5 pr-3">Entidade</th>
                        <th className="py-1.5 pr-3">Detalhe</th>
                        <th className="py-1.5 pr-3">Quando</th>
                        <th className="py-1.5">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.audit.map((item) => (
                        <tr key={item.id} className="border-b border-line/40">
                          <td className="py-2 pr-3 font-medium">
                            {item.action}
                          </td>
                          <td className="py-2 pr-3 text-muted">
                            {item.entity}
                            {item.entityId ? ` · ${item.entityId}` : ""}
                          </td>
                          <td className="py-2 pr-3 text-muted">
                            {item.detail ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-[10px] text-muted">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="py-2 text-[10px] text-muted">
                            {item.actor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          ) : null}
        </div>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-4 text-[10px] text-muted">
        <span>Errejota · administração</span>
        <span>
          Fontes públicas: COR-Rio, CNES/DATASUS, Defesa Civil e Data.Rio
        </span>
      </footer>
    </div>
  );
}
