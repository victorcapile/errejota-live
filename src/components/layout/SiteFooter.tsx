import Link from "next/link";
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const NAV_LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/sobre", label: "Sobre o projeto" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 hidden border-t border-line bg-background lg:block">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-6 py-10 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <p className="font-editorial text-xl font-semibold tracking-tight">
            errejota<span className="text-accent">.</span>live
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Rio de Janeiro · atlas urbano
          </p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">
            Catálogo geográfico de fontes públicas de câmeras e contexto urbano
            do Rio de Janeiro. Organizamos links oficiais, status declarado e
            proveniência.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            Revisão editorial · {formatDate(CATALOG_LAST_CHECKED_AT)}
          </p>
        </div>

        <nav aria-label="Navegação do rodapé">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Navegar
          </p>
          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-foreground/80 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            Transparência
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            <li>
              <Link
                href="/sobre"
                className="text-foreground/80 transition-colors hover:text-accent"
              >
                Metodologia
              </Link>
            </li>
            <li>
              <a
                href="/api/meta"
                className="text-foreground/80 transition-colors hover:text-accent"
              >
                Metadados da API
              </a>
            </li>
            <li>
              {/* Endpoint JSON da API, não uma página do App Router. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/api/sources"
                className="text-foreground/80 transition-colors hover:text-accent"
              >
                Fontes em JSON
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-5 text-[10px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Projeto pessoal de estudo, sem vínculo com os provedores citados.
            Nenhum player, gravação ou rastreamento é executado.
          </p>
          <p className="shrink-0 font-mono uppercase tracking-[0.08em]">
            Rio de Janeiro · RJ
          </p>
        </div>
      </div>
    </footer>
  );
}
