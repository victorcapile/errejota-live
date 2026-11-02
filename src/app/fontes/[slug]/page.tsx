import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { SourceBadges, Badge } from "@/components/catalog/SourceBadges";
import { SourceCard } from "@/components/catalog/SourceCard";
import { SourceDetailSkeleton } from "@/components/catalog/CatalogSkeletons";
import { getSourceBySlug, listSourceSlugs, listSources } from "@/lib/catalog";
import {
  AVAILABILITY_STATUS_META,
  CATEGORY_META,
  MEDIA_TYPE_META,
  PERMISSION_STATUS_META,
  SCOPE_META,
} from "@/lib/constants";
import {
  availabilityLabel,
  coordinatesLabel,
  formatDate,
  locationLabel,
  mediaLabel,
  openStreetMapUrl,
  permissionLabel,
  precisionLabel,
  providerKindLabel,
  scopeLabel,
} from "@/lib/format";

export async function generateStaticParams() {
  return listSourceSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/fontes/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const source = await getSourceBySlug(slug);

  if (!source) {
    return { title: "Fonte não encontrada" };
  }

  return {
    title: source.name,
    description: source.shortDescription,
    alternates: {
      canonical: `/fontes/${source.slug}`,
    },
    openGraph: {
      type: "article",
      title: source.name,
      description: source.shortDescription,
      locale: "pt_BR",
    },
  };
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function InfoCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-background/60 p-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
      {hint ? (
        <dd className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</dd>
      ) : null}
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function SourcePage({
  params,
}: PageProps<"/fontes/[slug]">) {
  return (
    <Suspense fallback={<SourceDetailSkeleton />}>
      <SourceDetail params={params} />
    </Suspense>
  );
}

async function SourceDetail({
  params,
}: Pick<PageProps<"/fontes/[slug]">, "params">) {
  await connection();
  const { slug } = await params;
  const source = await getSourceBySlug(slug);

  if (!source) {
    notFound();
  }

  const category = CATEGORY_META[source.category];
  const availability = AVAILABILITY_STATUS_META[source.availabilityStatus];
  const permission = PERMISSION_STATUS_META[source.permissionStatus];
  const media = MEDIA_TYPE_META[source.mediaType];
  const scope = SCOPE_META[source.scope];
  const coordinates = coordinatesLabel(source);
  const mapUrl = openStreetMapUrl(source);

  const relatedResult = await listSources({
    category: source.category,
    sort: "relevance",
    page: 1,
    pageSize: 6,
  });
  const related = relatedResult.items
    .filter((item) => item.id !== source.id)
    .slice(0, 3);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <nav aria-label="Trilha de navegação">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand">
              Mapa
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link
              href={`/?category=${source.category}`}
              className="transition-colors hover:text-brand"
            >
              {category.label}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li className="line-clamp-1 text-foreground/70" aria-current="page">
            {source.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              <CategoryIcon category={source.category} className="size-4" />
              {category.label}
            </span>
            {source.isFeatured ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
                Destaque editorial
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {source.name}
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
            {source.shortDescription}
          </p>

          <div className="mt-5">
            <SourceBadges source={source} detailed />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={source.sourcePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong"
            >
              Abrir página oficial
              <ExternalLink aria-hidden className="size-4" />
            </a>
            <Link
              href={`/?source=${source.slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-card px-5 text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Voltar ao mapa
            </Link>
          </div>

          <p className="mt-3 text-[11px] text-muted">
            O link abre {hostname(source.sourcePageUrl)} em uma nova aba, fora do
            Rio em Foco. Nenhum vídeo é carregado nesta página.
          </p>

          <section aria-labelledby="checagem" className="mt-10">
            <h2
              id="checagem"
              className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <ShieldCheck aria-hidden className="size-5 text-brand" />
              O que foi checado
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              {source.statusNote ??
                "Ainda não há uma nota editorial registrada para esta fonte."}
            </p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCell
                label="Disponibilidade"
                value={availabilityLabel(
                  source.availabilityStatus,
                  source.mediaType,
                )}
                hint={availability.description}
              />
              <InfoCell
                label="Permissão"
                value={permissionLabel(source.permissionStatus)}
                hint={permission.description}
              />
              <InfoCell
                label="Tipo de mídia"
                value={mediaLabel(source)}
                hint={media.description}
              />
              <InfoCell
                label="Última checagem"
                value={formatDate(source.lastCheckedAt)}
                hint="Data editorial declarada, não um monitoramento em tempo real."
              />
            </dl>
          </section>

          <section
            aria-labelledby="licenca"
            className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-6 dark:border-amber-900/60 dark:bg-amber-950/30"
          >
            <h2
              id="licenca"
              className="inline-flex items-center gap-2 text-base font-semibold tracking-tight"
            >
              <FileText aria-hidden className="size-4 text-accent" />
              Licença e uso
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {source.licenseNotes}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              <span className="font-semibold text-foreground/80">
                Atribuição:
              </span>{" "}
              {source.attribution}
            </p>
            {source.termsUrl ? (
              <a
                href={source.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand"
              >
                Termos do provedor
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : null}
            <p className="mt-4 rounded-lg border border-amber-200/60 bg-white/60 p-3 text-[11px] leading-relaxed text-muted dark:border-amber-900/50 dark:bg-black/20">
              O Rio em Foco não hospeda, grava, transcodifica ou redistribui imagens
              das fontes. O uso de cada página oficial segue os termos do
              provedor.
            </p>
          </section>

          <section
            aria-labelledby="proveniencia"
            className="mt-6 rounded-2xl border border-line bg-card p-6"
          >
            <h2
              id="proveniencia"
              className="inline-flex items-center gap-2 text-base font-semibold tracking-tight"
            >
              <Database aria-hidden className="size-4 text-brand" />
              Proveniência
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCell
                label="Conjunto de origem"
                value={source.provenanceDataset ?? "Não informado"}
              />
              <InfoCell
                label="Registro de origem"
                value={source.provenanceRecordId ?? "Não informado"}
              />
              <InfoCell
                label="Importado em"
                value={formatDate(source.importedAt)}
              />
              <InfoCell
                label="Atualizado em"
                value={formatDate(source.updatedAt)}
              />
              <InfoCell
                label="Tipo de provedor"
                value={providerKindLabel(source)}
              />
              <InfoCell label="Escopo" value={scopeLabel(source)} />
            </dl>
          </section>

          {source.tags.length > 0 ? (
            <section aria-labelledby="tags" className="mt-6">
              <h2
                id="tags"
                className="text-xs font-medium uppercase tracking-[0.16em] text-muted"
              >
                Tags
              </h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {source.tags.map((tag) => (
                  <li key={tag.id}>
                    <Link
                      href={`/?tag=${tag.slug}`}
                      className="inline-flex rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-brand/20 hover:text-brand"
                    >
                      #{tag.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Status declarado
            </p>
            <div className="mt-3">
              <Badge tone={availability.tone} dot>
                {availabilityLabel(
                  source.availabilityStatus,
                  source.mediaType,
                )}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {availability.description}
            </p>

            <dl className="mt-4 space-y-3 border-t border-line pt-4">
              <SidebarRow
                label="Permissão"
                value={permissionLabel(source.permissionStatus)}
              />
              <SidebarRow label="Mídia" value={mediaLabel(source)} />
              <SidebarRow
                label="Checado em"
                value={formatDate(source.lastCheckedAt)}
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Localização
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm font-medium">
              <MapPin
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-brand"
              />
              <span>{locationLabel(source)}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {source.region?.name ?? scope.label} · {precisionLabel(source)}
            </p>
            {source.addressHint ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {source.addressHint}
              </p>
            ) : null}

            {coordinates ? (
              <p className="mt-3 rounded-lg border border-line bg-background px-3 py-2 font-mono text-[11px] tracking-tight text-muted">
                {coordinates}
              </p>
            ) : null}

            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong"
              >
                Abrir no OpenStreetMap
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : null}

            {source.neighborhood ? (
              <Link
                href={`/?neighborhood=${source.neighborhood.slug}`}
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-background px-3 py-2 text-xs font-medium text-brand transition-colors hover:border-brand/30"
              >
                Ver fontes do bairro
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            ) : null}

            {source.scope === "city" ||
            source.scope === "state" ||
            source.scope === "national" ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                A fonte tem cobertura {scope.label.toLowerCase()} e não
                representa um ponto único no mapa.
              </p>
            ) : null}
          </div>

          {source.statusChecks.length > 0 ? (
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                Histórico técnico
              </p>
              <ul className="mt-3 space-y-3">
                {source.statusChecks.map((check) => (
                  <li
                    key={check.id}
                    className="border-t border-line pt-3 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-muted">
                        {formatDate(check.checkedAt)}
                      </span>
                      <span className="font-medium text-foreground">
                        {AVAILABILITY_STATUS_META[check.status].shortLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {check.httpStatus
                        ? `HTTP ${check.httpStatus}`
                        : "Sem código HTTP"}
                      {check.latencyMs ? ` · ${check.latencyMs} ms` : ""}
                    </p>
                    {check.notes ? (
                      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted">
                        {check.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Registros técnicos mínimos, sem conteúdo audiovisual.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-14 border-t border-line pt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Continue explorando
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Outras fontes de {category.label.toLowerCase()}
              </h2>
            </div>
            <Link
              href={`/?category=${source.category}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-strong"
            >
              Ver todas
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <SourceCard source={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
