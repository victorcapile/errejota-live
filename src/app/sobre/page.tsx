import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  EyeOff,
  Layers,
  Map,
  ShieldCheck,
  VideoOff,
} from "lucide-react";
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O Errejota é uma ferramenta OSINT de mapeamento de fontes públicas do Rio de Janeiro.",
};

const DATA = {
  cameras: 7571,
  neighborhoods: 162,
  regions: 9,
  sources: 23,
} as const;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2
        id={`${id}-heading`}
        className="mt-1 text-2xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Sobre o Errejota
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Uma ferramenta OSINT de mapeamento de fontes públicas do Rio de Janeiro.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          O Errejota é uma ferramenta de inteligência de fontes abertas (OSINT)
          que mapeia câmeras e fontes públicas do Rio de Janeiro em um mapa
          interativo por região e bairro. Cada ponto leva à página oficial do
          provedor — sem vídeo embutido, gravação ou rastreamento.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5 text-[11px] text-muted">
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Versão 1.1 alpha
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Rio de Janeiro · RJ
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            {DATA.cameras.toLocaleString("pt-BR")} câmeras
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Catálogo revisado em {formatDate(CATALOG_LAST_CHECKED_AT)}
          </span>
        </div>
      </header>

      <div className="mt-12 space-y-12">
        <Section
          id="mapa"
          eyebrow="Como funciona"
          title="Um mapa de links, não um player"
        >
          <p>
            As câmeras vêm de um arquivo exportado do mapa público do COR-Rio.
            Cada ponto guarda nome, coordenadas, bairro e o link oficial. Ao
            clicar, a página do provedor abre em uma nova aba — nenhum vídeo é
            carregado ou reproduzido no site.
          </p>
          <p>
            Os pontos usam a cor da região. Câmeras marcadas como offline
            continuam no mapa, mas com a bolinha apagada. Os filtros do menu
            combinam situação, região, bairro e busca; ao selecionar um bairro,
            o dossiê lista as câmeras com o link oficial e o status.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-card p-4">
              <Layers aria-hidden className="size-4 text-brand" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Filtros combinados
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Situação, região, bairro e busca no mesmo painel.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <Map aria-hidden className="size-4 text-brand" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Dossiê do bairro
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Lista as câmeras da área, com link e status de cada uma.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <ShieldCheck aria-hidden className="size-4 text-brand" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Link-only
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                O clique abre a página do provedor; nenhum vídeo é embutido.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="dados"
          eyebrow="Dados"
          title="O que está no mapa"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "câmeras", value: DATA.cameras },
              { label: "bairros", value: DATA.neighborhoods },
              { label: "regiões", value: DATA.regions },
              { label: "fontes", value: DATA.sources },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-line bg-card p-4"
              >
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {item.value.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <p>
            O status das câmeras (online/offline) é verificado e pode ser
            ajustado manualmente. Câmeras offline aparecem apagadas no mapa.
          </p>
        </Section>

        <Section
          id="limites"
          eyebrow="Limites"
          title="O que este projeto não faz"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: VideoOff,
                title: "Nenhum player",
                text: "Não embute nem reproduz vídeo. Apenas links.",
              },
              {
                icon: EyeOff,
                title: "Nenhuma gravação",
                text: "Não grava, armazena ou redistribui imagens.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-line bg-card p-4"
              >
                <item.icon aria-hidden className="size-4 text-accent" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="creditos"
          eyebrow="Créditos"
          title="Independência e atribuição"
        >
          <p>
            O Errejota é um projeto pessoal de estudo, sem vínculo com os
            provedores citados. Marcas, páginas e conteúdos pertencem aos
            respectivos titulares. O catálogo apenas descreve e liga para as
            fontes oficiais.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/bairros"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              <Map aria-hidden className="size-3.5" />
              Explorar bairros
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-card px-4 text-xs font-medium transition-colors hover:border-brand/30 hover:text-brand"
            >
              <Layers aria-hidden className="size-3.5" />
              Voltar ao mapa
            </Link>
          </div>
        </Section>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">
        Desenvolvido por Victor Capilé ·{" "}
        <a
          href="https://github.com/victorcapile/errejota"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          GitHub
        </a>
      </p>
    </article>
  );
}