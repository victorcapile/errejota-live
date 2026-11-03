import Link from "next/link";
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const NAV_LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/sobre", label: "Sobre o projeto" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 hidden border-t border-line bg-card/60 lg:block">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <p className="text-sm font-semibold tracking-tight">Rio em Foco</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Catálogo geográfico de fontes públicas de câmeras e contexto urbano
            do Rio de Janeiro. Organizamos links oficiais, status declarado e
            proveniência.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1.5 text-[11px] text-muted">
            Revisão editorial · {formatDate(CATALOG_LAST_CHECKED_AT)}
          </p>
        </div>

        <nav aria-label="Navegação do rodapé">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Navegar
          </p>
          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-foreground/80 transition-colors hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Projeto pessoal de estudo, sem vínculo com os provedores citados.
            Nenhum player, gravação ou rastreamento é executado.
          </p>
          <p className="shrink-0">Rio de Janeiro · RJ</p>
        </div>
      </div>
    </footer>
  );
}
