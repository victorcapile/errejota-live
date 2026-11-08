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
  ExternalLink,
  Flag,
  HeartHandshake,
  Hospital,
  House,
  Layers,
  Map,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { CATALOG_LAST_CHECKED_AT } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O errejota.live reúne câmeras públicas, chuva observada, risco de alagamento, equipamentos públicos e uma leitura 3D do Rio de Janeiro em um mapa por região e bairro.",
};

const DATA = {
  cameras: 7571,
  neighborhoods: 162,
  regions: 9,
  sources: 23,
  rainStations: 33,
  riskNeighborhoods: 158,
  helpPoints: 189,
  shelters: 12,
  hospitals: 76,
  publicEquipment: 277,
} as const;

const VERSION = "1.4.2";

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
    text: "Leitura de 1h e 24h da estação ativa mais próxima; 96h entra no risco.",
  },
  {
    icon: ShieldAlert,
    value: String(DATA.riskNeighborhoods),
    label: "bairros",
    title: "Risco de alagamento",
    text: "No dossiê: chuva × ISMFI do território, com contexto.",
  },
  {
    icon: Building2,
    value: "3D",
    label: "leitura",
    title: "Prédios com altura",
    text: "Uma camada 3D opcional para ler a forma da cidade, sem sair do mapa.",
  },
  {
    icon: HeartHandshake,
    value: DATA.publicEquipment.toLocaleString("pt-BR"),
    label: "equipamentos",
    title: "Equipamentos públicos",
    text: "Pontos de ajuda, abrigos e hospitais públicos, com filtro por tipo e bairro.",
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
  },
  {
    phase: "02",
    status: "No ar",
    title: "Chuva e risco",
    text: "A camada pluviométrica do Alerta Rio e o ISMFI estrutural por bairro.",
    items: [
      "33 estações e estação mais próxima",
      "Chuva de 1h, 24h e 96h",
      "Estágio operacional do COR-Rio",
      "Risco estrutural por bairro",
    ],
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
  },
  {
    phase: "04",
    status: "No ar",
    title: "Equipamentos e relatos",
    text: "A camada de ajuda, os relatos de câmera e a moderação no admin.",
    items: [
      "189 pontos de ajuda, 12 abrigos e 76 hospitais públicos",
      "Relatos com moderação, rate limit e auditoria",
      "Modo avançado automático em estágio 3+",
    ],
  },
] as const;

const EQUIPMENT = [
  { label: "Pontos de ajuda", icon: HeartHandshake },
  { label: "Abrigos", icon: House },
  { label: "Hospitais públicos", icon: Hospital },
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
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-balance font-editorial text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">
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
    <div className="border border-line p-2.5">
      <p className="font-editorial text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <article className="relative overflow-hidden">
        <section className="relative mx-auto max-w-[1400px] px-4 pb-8 pt-8 sm:px-6 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted">
                Sobre o errejota.live
              </p>
              <h1 className="mt-4 max-w-3xl text-balance font-editorial text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                O Rio de Janeiro em camadas de dados públicos.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                Câmeras, chuva observada, risco de alagamento, equipamentos
                públicos e uma leitura 3D dos prédios em um só mapa, por região
                e bairro. Cada câmera abre a página oficial do provedor.
              </p>

              <div className="mt-5 flex flex-wrap gap-1.5 text-[10px] text-muted">
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  Versão {VERSION}
                </span>
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  Rio de Janeiro · RJ
                </span>
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {DATA.cameras.toLocaleString("pt-BR")} câmeras
                </span>
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {DATA.publicEquipment} equipamentos públicos
                </span>
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {DATA.rainStations} estações de chuva
                </span>
                <span className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                  {DATA.sources} fontes
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center gap-2 bg-foreground px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent"
                >
                  Abrir o mapa
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative lg:justify-self-end">
              <div className="w-full max-w-xl border border-line bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted">
                      Cobertura atual
                    </p>
                    <p className="mt-1 font-editorial text-xl font-semibold tracking-tight">
                      Dados públicos, em um mapa
                    </p>
                  </div>
                  <span className="border border-line px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                    v{VERSION}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
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
                  <Stat
                    value={String(DATA.publicEquipment)}
                    label="equipamentos"
                  />
                  <Stat value={String(DATA.sources)} label="fontes" />
                </div>

                <div className="relative mt-4 hidden h-20 overflow-hidden border border-line bg-background sm:block sm:h-28">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-70"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, var(--color-line) 1px, transparent 0)",
                      backgroundSize: "14px 14px",
                    }}
                  />
                  <span className="absolute left-[18%] top-[30%] size-2 rounded-full bg-brand" />
                  <span className="absolute left-[44%] top-[56%] size-1.5 rounded-full bg-accent" />
                  <span className="absolute left-[68%] top-[36%] size-2 rounded-full bg-[#7c3aed]" />
                  <span className="absolute left-[79%] top-[70%] size-1.5 rounded-full bg-emerald-500" />
                  <span className="absolute left-[30%] top-[74%] size-1.5 rounded-full bg-brand/70" />
                  <span className="absolute bottom-2 left-3 text-[9px] text-muted">
                    7.571 câmeras · 277 equipamentos · 162 bairros
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
                  <span>OpenFreeMap · OpenStreetMap</span>
                  <span>3D · chuva · risco · ajuda</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="O que está no mapa"
              title="Cinco camadas, uma leitura da cidade."
              description="O mapa combina o catálogo de câmeras com contexto urbano: chuva observada, risco de alagamento, equipamentos públicos e uma camada 3D opcional."
            />
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Tudo em um só lugar, com filtros por região e bairro — e a fonte
              oficial a um clique.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden border border-line bg-card p-4 transition-colors last:col-span-2 hover:border-foreground/40 sm:p-5 xl:last:col-span-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-8 place-items-center border border-line text-accent sm:size-10">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl sm:text-2xl">
                        {feature.value}
                      </p>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {feature.label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold sm:text-sm">{feature.title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted sm:text-xs">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Como funciona"
                title="Do filtro ao link oficial em poucos cliques."
                description="O mapa foi feito para navegar rápido: escolha a situação, a região ou o bairro e veja o que está disponível."
              />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  {
                    icon: Layers,
                    title: "Filtros combinados",
                    text: "Situação, região, bairro e busca no mesmo painel.",
                  },
                  {
                    icon: Map,
                    title: "Dossiê do bairro",
                    text: "Lista câmeras ou equipamentos da área, com fonte e status.",
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
                  {
                    icon: Flag,
                    title: "Relatos de câmera",
                    text: "Reporte um problema no dossiê; a moderação aprova e aplica o status.",
                  },
                  {
                    icon: ShieldAlert,
                    title: "Modo avançado",
                    text: "Em estágio 3+, chuva, risco e ajuda entram; as câmeras saem.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="border border-line bg-card p-3"
                    >
                      <Icon aria-hidden className="size-4 text-accent" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted sm:text-xs">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden border border-line bg-card p-4 sm:block sm:p-5">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Filtros
                </p>
                <span className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  Todas · 7.571
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted">
                {["Todas", "Centro", "Zona Sul", "Zona Norte", "Zona Oeste"].map(
                  (item, index) => (
                    <span
                      key={item}
                      className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] ${
                        index === 0
                          ? "border-foreground bg-foreground text-background"
                          : "border-line text-muted"
                      }`}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-4 divide-y divide-line/60">
                {[
                  { name: "AV. PRES. VARGAS X RUA 1º DE MARÇO", status: "online" },
                  { name: "AV. VIEIRA SOUTO X R. FRANCISCO OTAVIANO", status: "online" },
                  { name: "AV. FRANCISCO BHERING, 200", status: "offline" },
                ].map((camera) => (
                  <div
                    key={camera.name}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px]">
                        {camera.name}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                        {camera.status === "online" ? "Online" : "Offline"} ·
                        link oficial
                      </p>
                    </div>
                    <span
                      className={`size-1.5 shrink-0 rounded-[1px] ${
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

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-16">
          <div className="grid gap-4">
            <div className="border border-line bg-card p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center border border-line text-accent sm:size-10">
                  <CloudRain aria-hidden className="size-4 sm:size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-editorial text-2xl font-semibold tracking-tight sm:text-3xl">
                    Chuva e risco, com contexto.
                  </h3>
                </div>
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div>
                  <p className="text-xs leading-relaxed text-muted sm:text-sm">
                    A chuva observada nas estações do Alerta Rio é associada ao
                    bairro pela estação ativa mais próxima, com 1h e 24h no card
                    e 96h no cálculo do risco, além de distância e horário. Em
                    geral a estação fica a até 6 km; em áreas isoladas, usamos a
                    mais próxima disponível e mostramos a distância. O risco de
                    alagamento é indicativo: cruza os limiares de chuva por
                    janela com o ISMFI estrutural da COPPE/UFRJ. Onde o ISMFI
                    não está disponível, o indicativo usa só a chuva. A chuva
                    define o piso do indicativo e o ISMFI pode elevá-lo; sem
                    chuva ou abaixo dos limiares, o risco é baixo. O alerta
                    oficial é sempre o do Alerta Rio / COR-Rio / Defesa Civil.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Stat value={String(DATA.rainStations)} label="estações" />
                    <Stat value="6 km" label="raio típico" />
                    <Stat value="~5 min" label="entre coletas" />
                    <Stat
                      value={String(DATA.riskNeighborhoods)}
                      label="bairros com ISMFI"
                    />
                  </div>
                </div>
                <div>
                  <div className="border-y border-line py-3 text-[10px] leading-relaxed text-muted">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-foreground">
                      Limiares de referência (Ehrlich et al., 2021)
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      <li>
                        1h: 25–50 mm médio · 50–80 mm alto · &gt;80 mm muito
                        alto.
                      </li>
                      <li>
                        24h: 85–140 mm médio · 140–220 mm alto · &gt;220 mm muito
                        alto.
                      </li>
                      <li>
                        96h: 140–220 mm (com 24h 25–50) médio · 220–300 mm (com
                        24h 50–100) alto · &gt;300 mm (com 24h &gt;100) muito
                        alto.
                      </li>
                    </ul>
                    <p className="mt-1">
                      Indicativo, não oficial. A tabela operacional histórica do
                      Alerta Rio (2005) fica documentada como referência.
                    </p>
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-muted">
                    Em emergência, siga os canais oficiais:{" "}
                    <a
                      href="https://alertario.rio.rj.gov.br/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-accent"
                    >
                      Alerta Rio
                    </a>
                    ,{" "}
                    <a
                      href="https://cor.rio/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-accent"
                    >
                      COR-Rio
                    </a>{" "}
                    e Defesa Civil (199).
                  </p>
                  <p className="mt-4 text-[10px] leading-relaxed text-muted">
                    A leitura de pluviômetro é pontual: pode chover no seu ponto
                    e não na estação mais próxima. O card do bairro continua
                    disponível mesmo com a camada de chuva desligada.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-line bg-card p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center border border-line text-accent">
                    <Building2 aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-editorial text-xl font-semibold tracking-tight sm:text-2xl">
                      Uma camada 3D para ler a cidade.
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
                      O botão <strong>Mostrar 3D</strong> inclina o mapa e
                      extruda os prédios com alturas do
                      OpenStreetMap/OpenFreeMap. O fade acompanha o zoom e os
                      pontos de câmera continuam por cima.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted lg:justify-end">
                  {["Alturas do OSM", "Fade no zoom", "Câmeras por cima"].map(
                    (item) => (
                      <span
                        key={item}
                        className="border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em]"
                      >
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                Cobertura e alturas variam conforme a base colaborativa. A
                camada é uma leitura de contexto.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-16">
          <SectionHeading
            eyebrow="Roadmap"
            title="O caminho até aqui — e o próximo quarteirão."
            description="As camadas planejadas até aqui estão no ar. O próximo passo é ampliar fontes e histórico."
          />

          <div className="relative mt-6">
            <div
              aria-hidden
              className="absolute left-[1.125rem] top-0 h-full w-px bg-line md:left-0 md:top-[1.125rem] md:h-px md:w-full"
            />
            <ol className="grid gap-5 md:grid-cols-4 md:gap-4">
              {ROADMAP.map((phase) => (
                <li key={phase.phase} className="relative pl-12 md:pl-0">
                  <div className="absolute left-0 top-0 grid size-9 place-items-center rounded-[2px] border border-foreground bg-foreground text-[10px] font-semibold text-background md:relative md:mb-4">
                    <CheckCircle2 aria-hidden className="size-4" />
                  </div>
                  <div className="border border-line bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="border border-line px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
                        {phase.status}
                      </span>
                      <span className="font-mono text-[8px] tabular-nums text-muted">
                        {phase.phase}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xs font-semibold sm:text-sm">
                      {phase.title}
                    </h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted sm:text-xs">
                      {phase.text}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-muted">
                      {phase.items.map((item) => (
                        <li key={item} className="flex gap-1.5">
                          <span className="mt-1 size-1 shrink-0 rounded-[1px] bg-accent" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <Clock3 aria-hidden className="size-3.5" />
            Depois: mais fontes, histórico e evolução do app.
          </div>

          <div className="mt-6 overflow-hidden border border-line bg-card p-4 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted">
                  No mapa
                </p>
                <h3 className="mt-1 font-editorial text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ajuda no mapa, com fonte e tipo.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  Pontos de ajuda, abrigos e hospitais públicos da Defesa Civil
                  e do CNES. Filtro por tipo, dossiê por bairro, endereço,
                  fonte, atribuição e link para o Google Maps. Somente
                  equipamentos públicos; hospitais particulares ficam de fora.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[
                    `${DATA.helpPoints} pontos de ajuda`,
                    `${DATA.shelters} abrigos`,
                    `${DATA.hospitals} hospitais públicos`,
                  ].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-3 inline-flex border border-line px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                  No ar
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {EQUIPMENT.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="grid size-14 place-items-center border border-line text-accent sm:size-20"
                    title={label}
                  >
                    <Icon aria-hidden className="size-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-16">
          <SectionHeading
            eyebrow="Princípios"
            title="Dados públicos, com fonte e contexto."
          />
          <div className="mt-6 grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            {[
              {
                icon: ExternalLink,
                title: "Link para a fonte",
                text: "Cada câmera abre a página oficial do provedor. O vídeo fica onde sempre esteve.",
              },
              {
                icon: Database,
                title: "Atribuição e proveniência",
                text: "Alerta Rio, COR-Rio, COPPE/UFRJ, Defesa Civil, CNES, Data.Rio, OpenStreetMap e OpenFreeMap.",
              },
              {
                icon: ShieldCheck,
                title: "Privacidade por padrão",
                text: "Sem contas e sem rastreamento de terceiros. Métricas agregadas e sem cookies via Vercel Analytics. Relatos usam hash de IP com sal rotativo só para limite de abuso.",
              },
              {
                icon: ShieldAlert,
                title: "Incerteza explícita",
                text: "Falha de fonte vira “dados indisponíveis”, nunca “normal” ou “sem risco”.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="border border-line bg-card p-4 sm:p-5"
                >
                  <Icon aria-hidden className="size-4 text-accent" />
                  <p className="mt-2 text-xs font-semibold sm:text-sm">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted sm:text-xs">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border border-line bg-card p-4 sm:p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-editorial text-xl font-semibold">Fontes e atribuições</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted sm:text-xs">
                Chuva: Alerta Rio · Estágio: COR-Rio · Risco: COPPE/UFRJ ·
                Ajuda: Defesa Civil e CNES/DATASUS · Coordenadas: Data.Rio e
                OpenStreetMap/Nominatim · Mapa e 3D: OpenFreeMap/OpenStreetMap.
              </p>
              <p className="mt-1 text-[10px] text-muted">
                Catálogo revisado em {formatDate(CATALOG_LAST_CHECKED_AT)}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 bg-foreground px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent"
              >
                <Map aria-hidden className="size-3.5" />
                Abrir o mapa
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>

            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-muted">
            <p>
              Desenvolvido por Victor Capilé ·{" "}
              <a
                href="https://github.com/victorcapile/errejota-live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-accent"
              >
                GitHub
              </a>
            </p>
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] sm:hidden">
              · Versão {VERSION}
            </span>
          </div>
        </section>
      </article>
      <SiteFooter />
    </>
  );
}
