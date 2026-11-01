import type { RegionSlug } from "@/lib/constants";

export type CuratedNewsItem = {
  id: string;
  regionSlug: RegionSlug;
  title: string;
  url: string;
  publisher: string;
};

/**
 * Canais oficiais cadastrados manualmente.
 *
 * Não são manchetes: são páginas de acompanhamento publicadas pelo próprio
 * órgão. A coleta automática de manchetes fica em `src/db/fetch-news.ts` e
 * grava itens com `kind: "headline"`.
 */
export const CURATED_NEWS: CuratedNewsItem[] = [
  {
    id: "channel-cor-rio",
    regionSlug: "cidade",
    title: "COR-Rio — Centro de Operações e Resiliência",
    url: "https://cor.rio/",
    publisher: "Prefeitura do Rio",
  },
  {
    id: "channel-prefeitura-rio",
    regionSlug: "cidade",
    title: "Prefeitura do Rio — notícias e serviços",
    url: "https://prefeitura.rio/",
    publisher: "Prefeitura do Rio",
  },
  {
    id: "channel-defesa-civil-rio",
    regionSlug: "cidade",
    title: "Defesa Civil Municipal — alertas e orientações",
    url: "https://www.rio.rj.gov.br/web/defesacivil",
    publisher: "Defesa Civil Rio",
  },
  {
    id: "channel-vlt",
    regionSlug: "centro",
    title: "VLT Carioca — operação e linhas",
    url: "https://www.vltrio.com.br/",
    publisher: "VLT Carioca",
  },
  {
    id: "channel-metro",
    regionSlug: "zona-sul",
    title: "MetrôRio — situação das linhas",
    url: "https://www.metrorio.com.br/",
    publisher: "MetrôRio",
  },
  {
    id: "channel-agetransp",
    regionSlug: "zona-norte",
    title: "AGETRANSP — regulação do transporte",
    url: "https://www.agetransp.rj.gov.br/",
    publisher: "AGETRANSP",
  },
  {
    id: "channel-brt",
    regionSlug: "zona-oeste",
    title: "BRT Rio — corredores e operação",
    url: "https://brtrio.com.br/",
    publisher: "BRT Rio",
  },
  {
    id: "channel-aguas-do-rio",
    regionSlug: "zona-oeste",
    title: "Águas do Rio — serviços e ocorrências",
    url: "https://www.aguasdorio.com.br/",
    publisher: "Águas do Rio",
  },
  {
    id: "channel-ufrj",
    regionSlug: "ilhas",
    title: "UFRJ — notícias da universidade",
    url: "https://ufrj.br/",
    publisher: "UFRJ",
  },
  {
    id: "channel-defesa-civil-rj",
    regionSlug: "estado",
    title: "Defesa Civil RJ — avisos e alertas",
    url: "https://www.rj.gov.br/defesacivil",
    publisher: "Defesa Civil RJ",
  },
  {
    id: "channel-inea",
    regionSlug: "estado",
    title: "INEA — meio ambiente e recursos hídricos",
    url: "https://www.inea.rj.gov.br/",
    publisher: "INEA",
  },
  {
    id: "channel-cemaden",
    regionSlug: "nacional",
    title: "CEMADEN — monitoramento de desastres",
    url: "https://www.gov.br/cemaden/pt-br",
    publisher: "CEMADEN",
  },
];
