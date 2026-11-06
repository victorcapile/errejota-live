import Link from "next/link";
import {
  ArrowUpRight,
  HelpCircle,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { DEVICE_LABELS, type DeviceType } from "@/lib/constants";
import type { UsageStats, VisitorLocationPoint } from "@/lib/usage";
import { VisitorLabelEditor } from "./VisitorLabelEditor";

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateTime(iso: string): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

function DeviceIcon({ device }: { device: DeviceType }) {
  const label = DEVICE_LABELS[device];
  const className = "size-3.5";

  const icon =
    device === "mobile" ? (
      <Smartphone aria-hidden className={className} />
    ) : device === "tablet" ? (
      <Tablet aria-hidden className={className} />
    ) : device === "desktop" ? (
      <Monitor aria-hidden className={className} />
    ) : (
      <HelpCircle aria-hidden className={className} />
    );

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex text-muted"
    >
      {icon}
    </span>
  );
}

function DeviceIcons({ devices }: { devices: DeviceType[] }) {
  const unique = Array.from(new Set(devices)).sort();
  if (unique.length === 0) {
    return <span className="text-[10px] text-muted">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-muted">
      {unique.map((device) => (
        <DeviceIcon key={device} device={device} />
      ))}
    </span>
  );
}

function formatPlace(point: VisitorLocationPoint | null): string {
  if (!point) {
    return "Local não identificado";
  }
  const parts = [point.street, point.neighborhood].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function Bars({
  items,
  max,
  colorClass,
}: {
  items: Array<{ label: string; count: number }>;
  max: number;
  colorClass: string;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-muted">Sem dados ainda.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium">
              {index + 1}. {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatNumber(item.count)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/60">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{
                width: `${Math.max(4, (item.count / max) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard({ stats }: { stats: UsageStats }) {
  const maxNeighborhood = Math.max(
    1,
    ...stats.neighborhoods.map((item) => item.count),
  );
  const maxRegion = Math.max(1, ...stats.regions.map((item) => item.count));
  const maxDaily = Math.max(1, ...stats.daily.map((item) => item.count));
  const maxHourly = Math.max(1, ...stats.hourly.map((item) => item.count));

  const totalEvents =
    stats.totals.pageViews +
    stats.totals.neighborhoodViews +
    stats.totals.cameraClicks;
  const pagePct = totalEvents
    ? (stats.totals.pageViews / totalEvents) * 100
    : 0;
  const hoodPct = totalEvents
    ? (stats.totals.neighborhoodViews / totalEvents) * 100
    : 0;
  const cameraPct = totalEvents
    ? (stats.totals.cameraClicks / totalEvents) * 100
    : 0;
  const donutBackground = totalEvents
    ? `conic-gradient(var(--color-brand) 0 ${pagePct}%, var(--color-accent) ${pagePct}% ${
        pagePct + hoodPct
      }%, #7c3aed ${pagePct + hoodPct}% 100%)`
    : "conic-gradient(var(--color-line) 0 100%)";

  const hasData = totalEvents > 0 || stats.locations.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Painel local
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Estatísticas de uso
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Eventos anônimos coletados neste navegador: visitas ao mapa, bairros
            abertos, cliques em câmeras e coordenadas compartilhadas
            voluntariamente no botão de localização. Em produção, o IP cru não
            é exibido.
          </p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-xl border border-line bg-card px-3 text-xs font-medium text-muted transition-colors hover:border-brand/30 hover:text-brand"
          >
            Sair
          </button>
        </form>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Visitas ao mapa"
          value={stats.totals.pageViews}
          hint="Aberturas da página inicial"
        />
        <StatCard
          label="Sessões únicas"
          value={stats.totals.sessions}
          hint="Navegadores anônimos distintos"
        />
        <StatCard
          label="Bairros abertos"
          value={stats.totals.neighborhoodViews}
          hint="Seleções de bairro no mapa"
        />
        <StatCard
          label="Cliques em câmeras"
          value={stats.totals.cameraClicks}
          hint="Aberturas de câmeras oficiais"
        />
      </div>

      {!hasData ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-card/60 px-6 py-10 text-center">
          <p className="text-sm font-medium">Ainda não há dados.</p>
          <p className="mt-1 text-sm text-muted">
            Navegue pelo mapa, abra bairros e clique em câmeras para começar a
            coletar estatísticas.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Distribuição de eventos</h2>
              <div className="mt-5 flex items-center gap-5">
                <div
                  className="relative grid size-28 shrink-0 place-items-center rounded-full"
                  style={{ background: donutBackground }}
                  aria-hidden
                >
                  <div className="grid size-16 place-items-center rounded-full bg-card text-center">
                    <span className="text-lg font-semibold tabular-nums">
                      {formatNumber(totalEvents)}
                    </span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2.5 text-xs">
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-brand" />
                      Visitas
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatNumber(stats.totals.pageViews)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-accent" />
                      Bairros
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatNumber(stats.totals.neighborhoodViews)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#7c3aed]" />
                      Câmeras
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatNumber(stats.totals.cameraClicks)}
                    </span>
                  </li>
                </ul>
              </div>
              <p className="mt-4 text-[11px] text-muted">
                {cameraPct.toFixed(0)}% dos eventos são cliques em câmeras.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Regiões mais vistas</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  por bairro
                </span>
              </div>
              <Bars
                items={stats.regions.map((item) => ({
                  label: item.name,
                  count: item.count,
                }))}
                max={maxRegion}
                colorClass="bg-accent"
              />
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Bairros mais vistos</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  {stats.neighborhoods.length} no topo
                </span>
              </div>
              <Bars
                items={stats.neighborhoods.map((item) => ({
                  label: item.name,
                  count: item.count,
                }))}
                max={maxNeighborhood}
                colorClass="bg-brand"
              />
            </section>

            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Câmeras mais abertas</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  {stats.cameras.length} no topo
                </span>
              </div>
              {stats.cameras.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem cliques em câmeras ainda.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line/60">
                  {stats.cameras.map((item, index) => (
                    <li key={`${item.cameraId}-${index}`}>
                      <Link
                        href={`/?camera=${encodeURIComponent(item.cameraId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir esta câmera no mapa"
                        className="group flex items-center justify-between gap-3 rounded-lg py-2.5 transition-colors hover:bg-brand/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium transition-colors group-hover:text-brand">
                            {index + 1}. {item.name}
                          </p>
                          <p className="truncate text-[10px] text-muted">
                            {item.neighborhoodName ??
                              item.neighborhoodSlug ??
                              "Sem bairro"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-brand">
                            {formatNumber(item.count)}
                          </span>
                          <ArrowUpRight
                            aria-hidden
                            className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Visitas por dia</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  últimos 14 dias
                </span>
              </div>
              {stats.daily.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem visitas registradas nos últimos 14 dias.
                </p>
              ) : (
                <div className="mt-5 flex h-36 items-end gap-2">
                  {stats.daily.map((item) => (
                    <div
                      key={item.day}
                      className="group flex h-full w-full max-w-12 flex-1 flex-col items-center justify-end gap-1"
                      title={`${item.day}: ${formatNumber(item.count)} visita(s)`}
                    >
                      <span className="text-[9px] tabular-nums text-muted">
                        {formatNumber(item.count)}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-brand/80 transition-colors group-hover:bg-brand"
                          style={{
                            height: `${Math.max(
                              4,
                              (item.count / maxDaily) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[8px] tabular-nums text-muted">
                        {item.day.slice(8, 10)}/{item.day.slice(5, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Atividade por hora</h2>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  últimas 24h
                </span>
              </div>
              {stats.hourly.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem visitas nas últimas 24 horas.
                </p>
              ) : (
                <div className="mt-5 flex h-36 items-end gap-1">
                  {stats.hourly.map((item) => (
                    <div
                      key={item.hour}
                      className="group flex h-full w-full max-w-12 min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      title={`${item.hour}h: ${formatNumber(item.count)} visita(s)`}
                    >
                      <span className="text-[8px] tabular-nums text-muted">
                        {formatNumber(item.count)}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t bg-accent/80 transition-colors group-hover:bg-accent"
                          style={{
                            height: `${Math.max(
                              4,
                              (item.count / maxHourly) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[7px] tabular-nums text-muted">
                        {item.hour}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Visitantes por mês</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                últimos 12 meses
              </span>
            </div>
            {stats.monthly.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Sem dados mensais ainda.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line/60 text-[10px] uppercase tracking-[0.12em] text-muted">
                      <th className="pb-2 pr-3 font-medium">Mês</th>
                      <th className="pb-2 pr-3 text-right font-medium">
                        Visitantes
                      </th>
                      <th className="pb-2 pr-3 text-right font-medium">
                        Sessões
                      </th>
                      <th className="pb-2 text-right font-medium">Visitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {stats.monthly.map((item) => (
                      <tr key={item.month}>
                        <td className="py-2 pr-3 font-medium">
                          {formatMonth(item.month)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatNumber(item.visitors)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted">
                          {formatNumber(item.sessions)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted">
                          {formatNumber(item.pageViews)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Visitantes únicos por hash de IP. Localizações detalhadas ficam 30
              dias; os eventos agregados ficam 12 meses.
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Visitantes por IP</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                {stats.visitors.length} no topo
              </span>
            </div>
            {stats.visitors.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Sem visitantes com IP registrado ainda.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line/60 text-[10px] uppercase tracking-[0.12em] text-muted">
                      <th className="pb-2 pr-3 font-medium">Visitante</th>
                      <th className="pb-2 pr-3 font-medium">Apelido</th>
                      <th className="pb-2 pr-3 font-medium">Dispositivo</th>
                      <th className="pb-2 pr-3 text-right font-medium">Eventos</th>
                      <th className="pb-2 pr-3 text-right font-medium">Sessões</th>
                      <th className="pb-2 text-right font-medium">Último acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {stats.visitors.map((visitor) => (
                      <tr key={visitor.key}>
                        <td className="py-2.5 pr-3">
                          <span className="font-mono text-[10px] text-muted">
                            {visitor.ip ?? `anon-${visitor.key.slice(0, 10)}`}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <VisitorLabelEditor
                            visitorKey={visitor.key}
                            nickname={visitor.nickname}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <DeviceIcons devices={visitor.devices} />
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatNumber(visitor.events)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-muted">
                          {formatNumber(visitor.sessions)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted">
                          {formatDateTime(visitor.lastSeen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              No ambiente local o IP cru aparece para facilitar o apelido. Em
              produção só o hash pseudônimo é gravado.
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Localizações por IP</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                últimos 30 dias
              </span>
            </div>
            {stats.locations.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Nenhuma coordenada registrada ainda. A localização só é gravada
                quando o visitante usa o botão de localização e autoriza o GPS.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {stats.locations.map((visitor) => (
                  <details
                    key={visitor.key}
                    className="group rounded-xl border border-line/70 bg-background/40"
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {visitor.nickname ??
                            visitor.ip ??
                            `anon-${visitor.key.slice(0, 10)}`}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {formatPlace(visitor.latest)} ·{" "}
                          {formatNumber(visitor.points)} coordenada(s) · último{" "}
                          {formatDateTime(visitor.lastSeen)}
                        </p>
                      </div>
                      {visitor.latest ? (
                        <span className="flex shrink-0 items-center gap-1.5 text-muted">
                          <DeviceIcon device={visitor.latest.device} />
                          {visitor.latest.accuracy !== null ? (
                            <span className="text-[10px]">
                              ±{Math.round(visitor.latest.accuracy)} m
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </summary>
                    <div className="border-t border-line/60 px-3 py-2">
                      <ul className="space-y-1.5">
                        {visitor.history.map((point, index) => (
                          <li
                            key={`${point.createdAt}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 text-[10px]"
                          >
                            <span className="tabular-nums text-muted">
                              {formatDateTime(point.createdAt)}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              <DeviceIcon device={point.device} />
                              <span
                                className="text-muted"
                                title={`${point.latitude}, ${point.longitude}`}
                              >
                                {formatPlace(point)}
                              </span>
                              {point.accuracy !== null ? (
                                <span className="text-muted">
                                  ±{Math.round(point.accuracy)} m
                                </span>
                              ) : null}
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=17/${point.latitude}/${point.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand hover:underline"
                              >
                                Ver no mapa
                              </a>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {visitor.history.length < visitor.points ? (
                        <p className="mt-2 text-[10px] text-muted">
                          Mostrando as {visitor.history.length} coordenadas mais
                          recentes.
                        </p>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              A coordenada é registrada apenas quando o visitante clica em
              “Centralizar minha localização” e autoriza o GPS. Rua e bairro vêm
              do Nominatim/OpenStreetMap; se a consulta falhar, mostramos as
              coordenadas. Em produção fica associada ao hash do IP, não ao IP
              cru.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
