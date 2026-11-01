import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogHref } from "@/lib/catalog-params";
import type { CatalogQuery } from "@/lib/types";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;

  for (const value of sorted) {
    if (previous > 0 && value - previous > 1) {
      items.push(previous === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    items.push(value);
    previous = value;
  }

  return items;
}

const LINK_CLASS =
  "inline-flex size-9 items-center justify-center rounded-lg border border-line bg-card text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand";
const DISABLED_CLASS =
  "inline-flex size-9 cursor-not-allowed items-center justify-center rounded-lg border border-line bg-background text-sm text-muted/50";

export function Pagination({
  query,
  page,
  totalPages,
}: {
  query: CatalogQuery;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPageItems(page, totalPages);

  return (
    <nav aria-label="Paginação do catálogo" className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={catalogHref({ ...query, page: page - 1 })}
              aria-label="Página anterior"
              className={LINK_CLASS}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </Link>
          ) : (
            <span aria-hidden className={DISABLED_CLASS}>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>

        {items.map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <Link
                href={catalogHref({ ...query, page: item })}
                aria-label={`Página ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={
                  item === page
                    ? "inline-flex size-9 items-center justify-center rounded-lg border border-brand bg-brand text-sm font-semibold text-white"
                    : LINK_CLASS
                }
              >
                {item}
              </Link>
            </li>
          ) : (
            <li
              key={item}
              aria-hidden
              className="inline-flex size-9 items-center justify-center text-sm text-muted"
            >
              …
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={catalogHref({ ...query, page: page + 1 })}
              aria-label="Próxima página"
              className={LINK_CLASS}
            >
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <span aria-hidden className={DISABLED_CLASS}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
