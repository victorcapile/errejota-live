import Link from "next/link";
import { SearchX } from "lucide-react";
import type { Paginated, Source } from "@/lib/types";
import { SourceCard } from "./SourceCard";

const SUGGESTIONS = [
  { label: "Praias", href: "/?category=beach" },
  { label: "Trânsito", href: "/?category=traffic" },
  { label: "Chuvas", href: "/?category=flood" },
  { label: "Dados abertos", href: "/?category=open_data" },
];

export function CatalogResults({ result }: { result: Paginated<Source> }) {
  if (result.items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand/5 text-brand/50">
          <SearchX aria-hidden className="size-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold tracking-tight">
          Nenhuma fonte encontrada
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Tente remover um filtro ou buscar por um termo mais amplo. Nem todo
          bairro ou tema possui uma fonte catalogada nesta fase.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            Limpar filtros
          </Link>
          <Link
            href="/bairros"
            className="inline-flex h-10 items-center rounded-lg border border-line bg-card px-4 text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand"
          >
            Ver bairros
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[11px] text-muted">Sugestões:</span>
          {SUGGESTIONS.map((suggestion) => (
            <Link
              key={suggestion.href}
              href={suggestion.href}
              className="rounded-full border border-line bg-background px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-brand/20 hover:text-brand"
            >
              {suggestion.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {result.items.map((source) => (
        <li key={source.id}>
          <SourceCard source={source} />
        </li>
      ))}
    </ul>
  );
}
