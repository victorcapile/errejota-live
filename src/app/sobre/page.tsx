import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  CloudRain,
  Database,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Hospital,
  Layers,
  Map,
  School,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O errejota.live reúne câmeras públicas, chuva observada, risco estrutural e uma leitura 3D do Rio de Janeiro em um mapa por região e bairro.",
};

const DATA = {
  cameras: 7571,
  neighborhoods: 162,
  regions: 9,
  sources: 23,
  rainStations: 33,
  riskNeighborhoods: 158,
} as const;

const FEATURES = [
  {
    icon: Camera,
    value: DATA.cameras.toLocaleString("pt-BR"),
    label: "câmeras",
    title: "Câmeras públicas",
    text: "Catálogo por região e bairro, com status declarado e link para a fonte oficial.",
  },
  {
    icon: CloudRain,
    value: String(DATA.rainStations),
    label: "estações",
    title: "Chuva observada",
    text: "Leitura da estação ativa mais próxima, com distância e atualização sob demanda.",
  },
  {
    icon: ShieldAlert,
    value: String(DATA.riskNeighborhoods),
    label: "bairros",
    title: "Risco estrutural",
    text: "ISMFI por bairro (COPPE/UFRJ): suscetibilidade do território, com contexto.",
  },
  {
    icon: Building2,
    value: "3D",
    label: "leitura",
    title: "Prédios com altura",
    text: "Uma camada 3D opcional para ler a forma da cidade, sem sair do mapa.",
  },
] as const;

const ROADMAP = [
  {
    phase: "01",
    status: "No ar",
    title: "Câmeras e filtros",
    text: "A base do mapa: catálogo público, filtros combinados e dossiê por bairro.",
    items: [
      "7.571 câmeras catalogadas",
      "Filtros por situação, região e bairro",
      "Dossiê com links oficiais",
    ],
    tone: "done",
  },
  {
    phase: "02",
    status: "No ar",
    title: "Chuva e risco",
    text: "A camada pluviométrica do Alerta Rio e o ISMFI estrutural por bairro.",
    items: [
      "33 estações e estação mais próxima",
      "Chuva de 1 h, atualizada sob demanda",
      "Risco estrutural por bairro",
    ],
    tone: "done",
  },
  {
    phase: "03",
    status: "No ar",
    title: "Leitura 3D",
    text: "Prédios extrudados com alturas do OpenStreetMap.",
    items: [
      "Alturas do OSM/OpenFreeMap",
      "Toggle Mostrar 3D",
      "Câmeras por cima dos prédios",
    ],
    tone: "done",
  },
  {
    phase: "04",
    status: "Planejado",
    title: "Equipamentos públicos",
    text: "A próxima camada: outros equipamentos públicos, com filtro por tipo e território.",
    items: [
      "Hospitais, escolas e universidades",
      "Academias da 3ª idade",
      "Filtro por tipo, região e bairro",
    ],
    tone: "next",
  },
] as const;

const EQUIPMENT = [
  { label: "Hospitais", icon: Hospital },
  { label: "Escolas", icon: School },
  { label: "Universidades", icon: GraduationCap },
  { label: "Academias da 3ª idade", icon: Dumbbell },
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-line/70 bg-background/60 p-3">
      <p className="text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <article className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-64 size-96 rounded-full bg-accent/10 blur-3xl"
        />

        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Sobre o errejota.live
              </p>
              <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                O Rio de Janeiro em camadas de dados públicos.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                Câmeras, chuva observada, risco estrutural e uma leitura 3D dos
                prédios em um só mapa, por região e bairro. Cada câmera abre a
                página oficial do provedor.
              </p>

              <div className="mt-6 flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span className="rounded-full border border-line bg-card px-3 py-1.5">
                  Versão 1.3.2
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1.5">
                  Rio de Janeiro · RJ
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1.5">
                  {DATA.cameras.toLocaleString("pt-BR")} câmeras
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1.5">
                  {DATA.rainStations} estações de chuva
                </span>
                <span className="rounded-full border border-line bg-card px-3 py-1.5">
                  {DATA.sources} fontes
                </span>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
                >
                  Abrir o mapa
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/bairros"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-medium transition-colors hover:border-brand/30 hover:text-brand"
                >
                  <Map aria-hidden className="size-4" />
                  Explorar bairros
                </Link>
              </div>
            </div>

            <div className="relative lg:justify-self-end">
              <div className="w-full max-w-xl rounded-3xl border border-line bg-card/90 p-5 shadow-xl backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                      Cobertura atual
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight">
                      Dados públicos, em um mapa
                    </p>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand">
                    v1.3.2
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <Stat
                    value={DATA.cameras.toLocaleString("pt-BR")}
                    label="câmeras"
                  />
                  <Stat value={String(DATA.rainStations)} label="estações" />
                  <Stat
                    value={String(DATA.neighborhoods)}
                    label="bairros"
                  />
                  <Stat value={String(DATA.regions)} label="regiões" />
                </div>

                <div className="relative mt-3 h-28 overflow-hidden rounded-2xl border border-line bg-background/60">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-70"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, var(--color-line) 1px, transparent 0)",
                      backgroundSize: "14px 14px",
                    }}
                  />
                  <span className="absolute left-[18%] top-[30%] size-2 rounded-full bg-brand shadow" />
                  <span className="absolute left-[44%] top-[56%] size-1.5 rounded-full bg-accent" />
                  <span className="absolute left-[68%] top-[36%] size-2 rounded-full bg-[#7c3aed]" />
                  <span className="absolute left-[79%] top-[70%] size-1.5 rounded-full bg-emerald-500" />
                  <span className="absolute left-[30%] top-[74%] size-1.5 rounded-full bg-brand/70" />
                  <span className="absolute bottom-2 left-3 text-[9px] text-muted">
                    7.571 pontos · 162 bairros
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
                  <span>OpenFreeMap · OpenStreetMap</span>
                  <span>3D · chuva · risco</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="O que está no mapa"
              title="Quatro camadas, uma leitura da cidade."
              description="O mapa combina o catálogo de câmeras com contexto urbano: chuva observada, risco estrutural e uma camada 3D opcional."
            />
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Tudo em um só lugar, com filtros por região e bairro — e a fonte
              oficial a um clique.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm transition-colors hover:border-brand/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums tracking-tight">
                        {feature.value}
                      </p>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {feature.label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold">{feature.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Como funciona"
                title="Do filtro ao link oficial em poucos cliques."
                description="O mapa foi feito para navegar rápido: escolha a situação, a região ou o bairro e veja o que está disponível."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Layers,
                    title: "Filtros combinados",
                    text: "Situação, região, bairro e busca no mesmo painel.",
                  },
                  {
                    icon: Map,
                    title: "Dossiê do bairro",
                    text: "Lista as câmeras da área, com link e status.",
                  },
                  {
                    icon: Search,
                    title: "Busca direta",
                    text: "Encontre uma câmera pelo nome ou endereço.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Status declarado",
                    text: "Online/offline com verificação e ajuste manual.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-xl border border-line bg-card p-4"
                    >
                      <Icon aria-hidden className="size-4 text-brand" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Filtros
                </p>
                <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] font-medium text-brand">
                  Todas · 7.571
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted">
                {["Todas", "Centro", "Zona Sul", "Zona Norte", "Zona Oeste"].map(
                  (item, index) => (
                    <span
                      key={item}
                      className={`rounded-full border px-2 py-1 ${
                        index === 0
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : "border-line bg-background"
                      }`}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: "AV. PRES. VARGAS X RUA 1º DE MARÇO", status: "online" },
                  { name: "AV. VIEIRA SOUTO X R. FRANCISCO OTAVIANO", status: "online" },
                  { name: "AV. FRANCISCO BHERING, 200", status: "offline" },
                ].map((camera) => (
                  <div
                    key={camera.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-background/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">
                        {camera.name}
                      </p>
                      <p className="text-[9px] text-muted">
                        {camera.status === "online" ? "Online" : "Offline"} ·
                        link oficial
                      </p>
                    </div>
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        camera.status === "online"
                          ? "bg-brand"
                          : "bg-muted/50"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted">
                Exemplo de leitura do dossiê. Os nomes reais vêm do catálogo.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <CloudRain aria-hidden className="size-5" />
              </span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                Chuva e risco, com contexto.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A chuva observada nas estações do Alerta Rio é associada ao
                bairro pela estação ativa mais próxima (até 5 km), com distância
                e horário no card. Quando a estação mais próxima do bairro
                registra chuva recente, o bairro selecionado recebe um
                preenchimento fraco em verde, amarelo ou vermelho conforme o
                risco de alagamento calculado pela combinação da intensidade da
                chuva com o ISMFI estrutural da COPPE/UFRJ. Bairros secos não
                são pintados, mesmo que esteja chovendo em outra região.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Stat value={String(DATA.rainStations)} label="estações" />
                <Stat value="5 km" label="raio da estação" />
                <Stat value="~5 min" label="atualização" />
                <Stat
                  value={String(DATA.riskNeighborhoods)}
                  label="bairros com ISMFI"
                />
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                A leitura de pluviômetro é pontual: pode chover no seu ponto e
                não na estação mais próxima. O card do bairro continua
                disponível mesmo com a camada de chuva desligada.
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Building2 aria-hidden className="size-5" />
              </span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                Uma camada 3D para ler a cidade.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                O botão <strong>Mostrar 3D</strong> inclina o mapa e extruda os
                prédios com alturas do OpenStreetMap/OpenFreeMap. O fade
                acompanha o zoom e os pontos de câmera continuam por cima.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5 text-[10px] text-muted">
                {["Alturas do OSM", "Fade no zoom", "Câmeras por cima"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-background px-2.5 py-1"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                Cobertura e alturas variam conforme a base colaborativa. A
                camada é uma leitura de contexto.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <SectionHeading
            eyebrow="Roadmap"
            title="O caminho até aqui — e o próximo quarteirão."
            description="O que já está no mapa, o que está em produção local e o que vem depois. A próxima camada é a de equipamentos públicos."
          />

          <div className="relative mt-10">
            <div
              aria-hidden
              className="absolute left-[1.125rem] top-0 h-full w-px bg-line md:left-0 md:top-[1.125rem] md:h-px md:w-full"
            />
            <ol className="grid gap-8 md:grid-cols-4 md:gap-4">
              {ROADMAP.map((phase) => {
                const isNext = phase.tone === "next";
                return (
                  <li key={phase.phase} className="relative pl-12 md:pl-0">
                    <div
                      className={`absolute left-0 top-0 grid size-9 place-items-center rounded-full border text-[11px] font-semibold md:relative md:mb-4 ${
                        isNext
                          ? "border-accent/40 bg-accent-soft text-accent"
                          : "border-brand/30 bg-brand/10 text-brand"
                      }`}
                    >
                      {isNext ? (
                        <Clock3 aria-hidden className="size-4" />
                      ) : (
                        <CheckCircle2 aria-hidden className="size-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl border p-4 ${
                        isNext
                          ? "border-accent/30 bg-accent-soft/30"
                          : "border-line bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                            isNext
                              ? "bg-accent-soft text-accent"
                              : "bg-brand/10 text-brand"
                          }`}
                        >
                          {phase.status}
                        </span>
                        <span className="text-[9px] tabular-nums text-muted">
                          {phase.phase}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold">
                        {phase.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {phase.text}
                      </p>
                      <ul className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-muted">
                        {phase.items.map((item) => (
                          <li key={item} className="flex gap-1.5">
                            <span
                              className={`mt-1 size-1 shrink-0 rounded-full ${
                                isNext ? "bg-accent" : "bg-brand"
                              }`}
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <Clock3 aria-hidden className="size-3.5" />
            Depois: mais fontes, histórico, admin em produção e performance.
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-card to-accent/10 p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-brand">
                  Próxima camada
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                  Equipamentos públicos, com filtro.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  Hospitais, escolas, universidades, academias da 3ª idade e
                  outros equipamentos públicos — com filtro por tipo, região e
                  bairro. A ideia é reunir tudo que for público, sempre com
                  fonte, endereço e atribuição.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {EQUIPMENT.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[10px] text-muted"
                    >
                      <Icon aria-hidden className="size-3" />
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-3 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold text-accent">
                  Planejado para depois
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="grid size-20 place-items-center rounded-2xl border border-line bg-card/80 text-brand"
                  >
                    <Icon aria-hidden className="size-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <SectionHeading
            eyebrow="Princípios"
            title="Dados públicos, com fonte e contexto."
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: ExternalLink,
                title: "Link para a fonte",
                text: "Cada câmera abre a página oficial do provedor. O vídeo fica onde sempre esteve.",
              },
              {
                icon: Database,
                title: "Atribuição e proveniência",
                text: "Alerta Rio, COPPE/UFRJ, OpenStreetMap e OpenFreeMap, com a fonte em cada camada.",
              },
              {
                icon: ShieldCheck,
                title: "Privacidade por padrão",
                text: "Sem contas e sem rastreamento de terceiros. As métricas são anônimas; a coordenada só é registrada quando você usa o botão de localização e autoriza o GPS. Para exibir rua e bairro, ela é consultada no Nominatim/OpenStreetMap.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-line bg-card p-5 shadow-sm"
                >
                  <Icon aria-hidden className="size-5 text-brand" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-card p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Fontes e atribuições</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Chuva: Alerta Rio · Risco: COPPE/UFRJ · Mapa e 3D:
                OpenFreeMap/OpenStreetMap.
              </p>
              <p className="mt-1 text-[10px] text-muted">
                Catálogo revisado em {formatDate(CATALOG_LAST_CHECKED_AT)}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
              >
                <Map aria-hidden className="size-3.5" />
                Abrir o mapa
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
              <Link
                href="/bairros"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-card px-4 text-xs font-medium transition-colors hover:border-brand/30 hover:text-brand"
              >
                <Layers aria-hidden className="size-3.5" />
                Explorar bairros
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted">
            Desenvolvido por Victor Capilé ·{" "}
            <a
              href="https://github.com/victorcapile/errejota-live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              GitHub
            </a>
          </p>
        </section>
      </article>
      <SiteFooter />
    </>
  );
}
