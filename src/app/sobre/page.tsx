import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Braces,
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
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Metodologia, limites, status e API do Rio em Foco, um mapa e catálogo de câmeras e fontes públicas do Rio de Janeiro.",
};

const DATA = {
  cameras: 7571,
  neighborhoods: 162,
  regions: 9,
  sources: 23,
} as const;

const CAMERA_EXPORT_DATE = "2026-11-01";

const NOT_DONE = [
  {
    icon: VideoOff,
    title: "Nenhum player",
    description:
      "Todas as fontes são links externos. Nenhum vídeo é embutido ou reproduzido no site.",
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
    path: "/api/cameras",
    description:
      "Câmeras do mapa; aceita region, neighborhood e busca por nome.",
  },
  {
    method: "GET",
    path: "/api/cameras/status",
    description: "Resumo de câmeras online, offline e sem status.",
  },
  {
    method: "POST",
    path: "/api/cameras/status",
    description:
      "Verifica um lote no endpoint de sessão do provedor e grava o estado.",
  },
  {
    method: "POST",
    path: "/api/cameras/status/manual",
    description:
      "Marca uma câmera manualmente como online, offline ou sem status.",
  },
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
] as const;

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

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Layers;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <Icon aria-hidden className="size-4 text-brand" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
    </div>
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
          Mapa e catálogo das câmeras e fontes públicas do Rio de Janeiro.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          O Rio em Foco reúne {DATA.cameras.toLocaleString("pt-BR")} câmeras e{" "}
          {DATA.sources} fontes públicas em um mapa por região e bairro. Cada
          ponto leva à página oficial do provedor; o status é verificado no
          player e pode ser ajustado manualmente. Sem vídeo embutido, gravação
          ou rastreamento.
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
          title="Um mapa, não um player"
        >
          <p>
            Os pontos vêm de um arquivo local exportado do mapa público do
            COR-Rio e fornecido pelo usuário. O projeto não raspa a lista, não
            usa UA do app e não contorna os controles de acesso do provedor.
            Cada ponto guarda nome, coordenadas, bairro e o link oficial.
          </p>
          <p>
            Os pontos usam a cor da região. Câmeras marcadas como offline
            continuam no mapa, mas com a bolinha apagada. Os filtros do menu
            combinam situação, região, bairro e busca; ao selecionar um bairro,
            o dossiê lista as câmeras com o link oficial e o status.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={Layers}
              title="Filtros combinados"
              text="Situação, região, bairro e busca no mesmo painel."
            />
            <FeatureCard
              icon={Map}
              title="Dossiê do bairro"
              text="Lista as câmeras da área, com link e status de cada uma."
            />
            <FeatureCard
              icon={Link2}
              title="Link-only"
              text="O clique abre a página do provedor; nenhum vídeo é embutido."
            />
          </div>
        </Section>

        <Section
          id="status"
          eyebrow="Status das câmeras"
          title="Online, offline ou inconclusivo"
        >
          <p>
            A checagem automática consulta o endpoint de sessão que o player do
            provedor usa. Falhas de sessão viram offline; um 200 indica que a
            sessão abriu, mas não garante que o vídeo esteja passando. Por isso
            o status é conservador e pode ser ajustado manualmente.
          </p>
          <p>
            Cada câmera no dossiê tem um botão para marcar online ou offline. A
            marcação manual fica gravada e a checagem automática padrão não a
            sobrescreve. Câmeras offline aparecem apagadas no mapa e com o selo
            <span className="mx-1 rounded-full border border-line bg-background px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
              offline
            </span>
            no dossiê.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={Radio}
              title="Checagem automática"
              text="Uma requisição por câmera ao endpoint de sessão do player."
            />
            <FeatureCard
              icon={Wrench}
              title="Ajuste manual"
              text="O botão do dossiê corrige o estado observado no player."
            />
            <FeatureCard
              icon={EyeOff}
              title="Offline visível"
              text="O ponto não some: fica cinza-claro, apagado, com contorno."
            />
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
            As câmeras vêm de{" "}
            <code className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground">
              data/cameras.json
            </code>
            , exportado do mapa público do COR-Rio em{" "}
            {formatDate(CAMERA_EXPORT_DATE)}. Os contornos de bairros vêm de{" "}
            <code className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground">
              public/bairros.geojson
            </code>
            ; as fontes do catálogo são curadas em{" "}
            <code className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground">
              src/db/seed-data/sources.ts
            </code>
            .
          </p>
          <p>
            Dados de terceiros mantêm as licenças, atribuições e condições
            indicadas nas páginas originais. O mapa é um índice de links, não
            uma cópia dos serviços.
          </p>
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
          id="api"
          eyebrow="API"
          title="Leitura e manutenção"
        >
          <p className="inline-flex items-center gap-2 text-xs text-foreground">
            <Braces aria-hidden className="size-4 text-brand" />
            Endpoints públicos para leitura e rotas de manutenção do status.
          </p>
          <ul className="space-y-2">
            {ENDPOINTS.map((endpoint) => (
              <li
                key={`${endpoint.method}-${endpoint.path}`}
                className="rounded-xl border border-line bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      endpoint.method === "GET"
                        ? "bg-brand/10 text-brand"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-[11px] font-medium text-foreground">
                    {endpoint.path}
                  </code>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {endpoint.description}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Parâmetros inválidos recebem 400; item inexistente recebe 404;
            falhas de consulta recebem 500. Em produção, as rotas POST exigem o
            token de manutenção configurado no ambiente.
          </p>
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
            Os pontos de câmera vêm de um arquivo exportado do mapa público do
            COR-Rio e fornecido pelo usuário; não há raspagem, player embutido
            ou redistribuição de vídeo. A referência de produto é o CamerasRJ,
            que suspendeu suas transmissões em outubro de 2026 após notificação
            do COR-Rio; nenhum feed ou lista dele é reutilizado aqui.
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
        <Database aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Projeto em desenvolvimento incremental. O catálogo e o status das
        câmeras são revisados manualmente e podem conter estados inconclusivos;
        a checagem automática não substitui a conferência no player oficial.
      </p>

      <p className="mt-6 text-center text-[11px] text-muted">
        Desenvolvido por Victor Capilé
      </p>
    </article>
  );
}
