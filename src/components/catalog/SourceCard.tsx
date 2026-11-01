import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, Star } from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";
import { catalogHref } from "@/lib/catalog-params";
import { locationLabel } from "@/lib/format";
import type { Source } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { SourceBadges } from "./SourceBadges";

export function SourceCard({ source }: { source: Source }) {
  const category = CATEGORY_META[source.category];
  const detailHref = `/fontes/${source.slug}`;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(22,33,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_18px_40px_-28px_rgba(15,76,92,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={catalogHref({ category: source.category })}
          className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-brand transition-colors hover:text-brand-strong"
        >
          <CategoryIcon category={source.category} className="size-4" />
          {category.label}
        </Link>
        {source.isFeatured ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
            <Star aria-hidden className="size-3 fill-current" />
            Destaque
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
        <Link
          href={detailHref}
          className="transition-colors hover:text-brand"
        >
          {source.name}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
        {source.shortDescription}
      </p>

      <div className="mt-4">
        <SourceBadges source={source} />
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-muted">
        <p className="flex items-start gap-1.5">
          <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand/70" />
          <span className="line-clamp-1">
            <span className="sr-only">Localização: </span>
            {locationLabel(source)}
          </span>
        </p>
        <p className="line-clamp-1 pl-5">{source.providerName}</p>
      </div>

      {source.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {source.tags.slice(0, 3).map((tag) => (
            <li key={tag.id}>
              <Link
                href={catalogHref({ tag: tag.slug })}
                className="inline-flex rounded-full border border-line bg-background px-2 py-1 text-[11px] text-muted transition-colors hover:border-brand/20 hover:text-brand"
              >
                #{tag.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-strong"
          >
            Ver ficha
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <a
            href={source.sourcePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir página oficial de ${source.name} em nova aba`}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-brand"
          >
            Página oficial
            <ExternalLink aria-hidden className="size-3" />
          </a>
        </div>
      </div>
    </article>
  );
}
