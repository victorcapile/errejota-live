import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Braces,
  CirclePlay,
  Clock,
  Compass,
  Database,
  EyeOff,
  Layers,
  Link2,
  Map,
  Radio,
  ScanEye,
  ShieldCheck,
  VideoOff,
  Wrench,
} from "lucide-react";
import {
  AVAILABILITY_STATUS_META,
  AVAILABILITY_STATUS_VALUES,
  CATALOG_LAST_CHECKED_AT,
  MEDIA_TYPE_META,
  PERMISSION_STATUS_META,
  PERMISSION_STATUS_VALUES,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Metodologia, limites e política editorial do Rio em Foco, um catálogo geográfico de fontes públicas de câmeras e contexto urbano do Rio de Janeiro.",
};

const NOT_DONE = [
  {
    icon: VideoOff,
    title: "Nenhum player",
    description:
      "Todas as fontes são links externos. Não incorporamos vídeo nesta fase.",
  },
  {
    icon: ScanEye,
    title: "Nenhum reconhecimento",
    description:
      "Sem reconhecimento facial, OCR de placas, reidentificação ou rastreamento de pessoas e veículos.",
  },
  {
    icon: EyeOff,
    title: "Nenhuma gravação",
    description:
      "Não gravamos, armazenamos ou redistribuímos imagens das fontes.",
  },
  {
    icon: ShieldCheck,
    title: "Nenhum bypass",
    description:
      "Não contornamos autenticação, DRM, CORS, geobloqueio ou limites de acesso.",
  },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/sources",
    description: "Lista paginada com busca, filtros e ordenação.",
  },
  {
    method: "GET",
    path: "/api/sources/[slug]",
    description: "Ficha completa de uma fonte, incluindo histórico técnico.",
  },
  {
    method: "GET",
    path: "/api/neighborhoods",
    description: "Bairros com contagem de fontes; aceita region e q.",
  },
  {
    method: "GET",
    path: "/api/meta",
    description: "Categorias, regiões, bairros, tags e estatísticas.",
  },
  {
    method: "GET",
    path: "/api/cameras",
    description:
      "Câmeras importadas de arquivo local; aceita region e neighborhood.",
  },
];

const PHASES = [
  {
    number: "01",
    title: "Catálogo",
    status: "Atual",
    description:
      "Fontes oficiais, busca, filtros, bairros, proveniência, API e PWA.",
  },
  {
    number: "02",
    title: "Mapa",
    status: "Atual",
    description:
      "Mapa com MapLibre GL e estilo claro/escuro. Clustering e mais pontos ficam para depois.",
  },
  {
    number: "03",
    title: "Players",
    status: "Futuro",
    description:
      "Um tipo por vez, somente com permissão verificada e auditoria registrada.",
  },
  {
    number: "04",
    title: "Operação",
    status: "Futuro",
    description:
      "Importador idempotente, revisão editorial e monitor conservador.",
  },
];

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
          <Compass aria-hidden className="size-4 text-brand" />
          Sobre o Rio em Foco
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Ferramenta OSINT para estudar o território do Rio de Janeiro.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          O Rio em Foco é um catálogo geográfico de fontes públicas de câmeras do Rio
          de Janeiro: um mapa com bairros delimitados e pontos de câmera, cada
          um ligando à página oficial do provedor. Serve para estudar o território
          e descobrir fontes oficiais, sem reproduzir vídeo, rastrear pessoas
          ou burlar acesso.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5 text-[11px] text-muted">
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Versão 1.1 alpha
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Rio de Janeiro · RJ
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1.5">
            Revisão de {formatDate(CATALOG_LAST_CHECKED_AT)}
          </span>
        </div>
      </header>

      <div className="mt-12 space-y-12">
        <Section
          id="produto"
          eyebrow="O produto"
          title="Proveniência antes de interface"
        >
          <p>
            Cada ficha reúne a URL oficial, o provedor, a licença ou condição de
            uso, a data da última checagem e o status declarado. O botão
            principal sempre leva à página do provedor em uma nova aba.
          </p>
          <p>
            Os pontos âmbar do mapa são câmeras de um arquivo local fornecido
            pelo usuário (CSV ou JSON), não de raspagem. Cada ponto abre a
            página oficial do provedor em nova aba; nenhum vídeo é embutido ou
            reproduzido aqui.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Link2,
                title: "Link-only por padrão",
                text: "O embed é uma exceção documentada, nunca uma conveniência.",
              },
              {
                icon: Clock,
                title: "Checagem datada",
                text: "“Página respondeu” não é o mesmo que “vídeo ao vivo”.",
              },
              {
                icon: Database,
                title: "Dados explícitos",
                text: "Status, permissão e proveniência são campos do catálogo.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-line bg-card p-4"
              >
                <item.icon aria-hidden className="size-4 text-brand" />
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
          id="limites"
          eyebrow="Limites"
          title="O que este projeto não faz"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {NOT_DONE.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-line bg-card p-4"
              >
                <item.icon aria-hidden className="size-4 text-accent" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {item.description}
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
            O Rio em Foco é um projeto pessoal de estudo, sem vínculo com os
            provedores citados. Marcas, páginas e conteúdos pertencem aos
            respectivos titulares. O catálogo apenas descreve e liga para as
            fontes oficiais.
          </p>
          <p>
            A referência de produto é o CamerasRJ, usada apenas como inspiração
            de organização. O CamerasRJ suspendeu suas transmissões em outubro
            de 2026 após notificação do COR-Rio; por isso, nenhum feed ou lista
            dele é reutilizado aqui.
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

      <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
        <Wrench aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Projeto em desenvolvimento incremental. O catálogo é revisado
        manualmente e pode conter fontes com estado inconclusivo.
      </p>

      <p className="mt-6 text-center text-[11px] text-muted">
        Desenvolvido por Victor Capilé
      </p>
    </article>
  );
}
