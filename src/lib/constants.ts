export const CATEGORY_VALUES = [
  "traffic",
  "weather",
  "sea",
  "beach",
  "flood",
  "air",
  "emergency",
  "mobility",
  "port",
  "airport",
  "infrastructure",
  "open_data",
  "government",
] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

export const CATEGORY_META: Record<
  Category,
  { label: string; description: string; tone: string; icon: string }
> = {
  traffic: {
    label: "Trânsito",
    description: "Câmeras, condições de vias, interdições e operações de tráfego.",
    tone: "amber",
    icon: "TrafficCone",
  },
  weather: {
    label: "Clima e tempo",
    description: "Previsão, avisos meteorológicos e dados observados.",
    tone: "sky",
    icon: "CloudSun",
  },
  sea: {
    label: "Maré e mar",
    description: "Marés, condições do mar e informações de navegação.",
    tone: "cyan",
    icon: "Waves",
  },
  beach: {
    label: "Praias e balneabilidade",
    description: "Boletins de balneabilidade, qualidade da água e condições de praia.",
    tone: "teal",
    icon: "Umbrella",
  },
  flood: {
    label: "Chuvas e cheias",
    description: "Alertas de cheia, níveis de rios e monitoramento hidrológico.",
    tone: "blue",
    icon: "CloudRain",
  },
  air: {
    label: "Qualidade do ar",
    description: "Monitoramento da qualidade do ar e índices de poluentes.",
    tone: "violet",
    icon: "Wind",
  },
  emergency: {
    label: "Alertas e Defesa Civil",
    description: "Avisos oficiais, emergências e orientações de proteção civil.",
    tone: "red",
    icon: "Siren",
  },
  mobility: {
    label: "Mobilidade urbana",
    description: "Metrô, BRT, trens, VLT e informações operacionais de transporte.",
    tone: "indigo",
    icon: "BusFront",
  },
  port: {
    label: "Porto e logística",
    description: "Autoridade portuária, operações e informações do porto.",
    tone: "slate",
    icon: "Anchor",
  },
  airport: {
    label: "Aeroportos",
    description: "Aeroportos, voos e acesso aeroportuário.",
    tone: "zinc",
    icon: "Plane",
  },
  infrastructure: {
    label: "Infraestrutura urbana",
    description: "Água, esgoto, energia, gás e ocorrências de serviços.",
    tone: "orange",
    icon: "UtilityPole",
  },
  open_data: {
    label: "Dados abertos",
    description: "Datasets, APIs e mapas oficiais para consulta e validação.",
    tone: "emerald",
    icon: "Database",
  },
  government: {
    label: "Governo e serviços",
    description: "Portais institucionais, atendimento e serviços públicos.",
    tone: "stone",
    icon: "Landmark",
  },
};

export const MEDIA_TYPE_VALUES = [
  "external_page",
  "iframe_embed",
  "hls",
  "webrtc",
  "image",
  "other",
] as const;

export type MediaType = (typeof MEDIA_TYPE_VALUES)[number];

export const MEDIA_TYPE_META: Record<
  MediaType,
  { label: string; description: string }
> = {
  external_page: {
    label: "Página oficial",
    description: "Link externo. Nenhum player é carregado nesta página.",
  },
  iframe_embed: {
    label: "Embed oficial",
    description: "Iframe publicado pelo provedor, sujeito a autorização.",
  },
  hls: {
    label: "HLS",
    description: "Playlist de vídeo HTTP. Suporte varia por navegador.",
  },
  webrtc: {
    label: "WebRTC",
    description: "Vídeo em tempo real com negociação de sessão.",
  },
  image: {
    label: "Imagem",
    description: "Imagem estática publicada pela fonte.",
  },
  other: {
    label: "Outro",
    description: "Tipo de mídia ainda não classificado.",
  },
};

export const PERMISSION_STATUS_VALUES = [
  "verified",
  "public_link_only",
  "permission_required",
  "blocked",
  "unknown",
] as const;

export type PermissionStatus = (typeof PERMISSION_STATUS_VALUES)[number];

export const PERMISSION_STATUS_META: Record<
  PermissionStatus,
  { label: string; shortLabel: string; description: string; tone: string }
> = {
  verified: {
    label: "Embed verificado",
    shortLabel: "Verificado",
    description: "O provedor documenta e autoriza a incorporação.",
    tone: "green",
  },
  public_link_only: {
    label: "Somente link público",
    shortLabel: "Link externo",
    description: "A página é pública, mas não há autorização de embed.",
    tone: "blue",
  },
  permission_required: {
    label: "Permissão necessária",
    shortLabel: "Permissão",
    description: "O uso depende de autorização do provedor.",
    tone: "amber",
  },
  blocked: {
    label: "Bloqueado",
    shortLabel: "Bloqueado",
    description: "O provedor restringiu o uso ou pediu remoção.",
    tone: "red",
  },
  unknown: {
    label: "Permissão não verificada",
    shortLabel: "Não verificado",
    description: "A permissão ainda não foi revisada.",
    tone: "stone",
  },
};

export const AVAILABILITY_STATUS_VALUES = [
  "online",
  "degraded",
  "offline",
  "unknown",
  "suspended",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS_VALUES)[number];

export const AVAILABILITY_STATUS_META: Record<
  AvailabilityStatus,
  { label: string; shortLabel: string; description: string; tone: string }
> = {
  online: {
    label: "Online",
    shortLabel: "Online",
    description: "A última checagem confirmou o comportamento prometido.",
    tone: "green",
  },
  degraded: {
    label: "Degradado",
    shortLabel: "Degradado",
    description: "Responde, mas com falha ou limitação parcial.",
    tone: "amber",
  },
  offline: {
    label: "Indisponível",
    shortLabel: "Offline",
    description: "Não respondeu na última checagem.",
    tone: "red",
  },
  unknown: {
    label: "Não verificado",
    shortLabel: "Não verificado",
    description: "Ainda não há checagem conclusiva.",
    tone: "stone",
  },
  suspended: {
    label: "Transmissão suspensa",
    shortLabel: "Suspenso",
    description: "A exibição foi suspensa pelo provedor ou por autoridade.",
    tone: "red",
  },
};

export const SCOPE_VALUES = [
  "point",
  "neighborhood",
  "city",
  "state",
  "national",
] as const;

export type Scope = (typeof SCOPE_VALUES)[number];

export const SCOPE_META: Record<Scope, { label: string; description: string }> = {
  point: {
    label: "Ponto",
    description: "Localização pontual divulgada pela fonte.",
  },
  neighborhood: {
    label: "Bairro",
    description: "Referência de bairro, sem coordenada exata da câmera.",
  },
  city: {
    label: "Cidade",
    description: "Fonte de abrangência municipal.",
  },
  state: {
    label: "Estado",
    description: "Fonte de abrangência estadual.",
  },
  national: {
    label: "Nacional",
    description: "Fonte de abrangência nacional.",
  },
};

export const PROVIDER_KIND_VALUES = [
  "municipal",
  "state",
  "federal",
  "university",
  "concessionaire",
  "private",
  "ngo",
  "other",
] as const;

export type ProviderKind = (typeof PROVIDER_KIND_VALUES)[number];

export const PROVIDER_KIND_META: Record<ProviderKind, { label: string }> = {
  municipal: { label: "Órgão municipal" },
  state: { label: "Órgão estadual" },
  federal: { label: "Órgão federal" },
  university: { label: "Universidade" },
  concessionaire: { label: "Concessionária" },
  private: { label: "Iniciativa privada" },
  ngo: { label: "Organização civil" },
  other: { label: "Outro" },
};

export const LOCATION_PRECISION_VALUES = [
  "exact",
  "approximate",
  "unknown",
] as const;

export type LocationPrecision = (typeof LOCATION_PRECISION_VALUES)[number];

export const LOCATION_PRECISION_META: Record<
  LocationPrecision,
  { label: string; description: string }
> = {
  exact: {
    label: "Coordenada exata",
    description: "A fonte divulga a coordenada do ponto.",
  },
  approximate: {
    label: "Localização aproximada",
    description: "Coordenada de referência do bairro ou ponto, não da câmera.",
  },
  unknown: {
    label: "Localização não informada",
    description: "A fonte não divulga coordenada utilizável.",
  },
};

export const REGION_VALUES = [
  "centro",
  "zona-sul",
  "zona-norte",
  "zona-oeste",
  "zona-sudoeste",
  "ilhas",
  "cidade",
  "estado",
  "nacional",
] as const;

/**
 * Regiões de escopo (municipal, estadual, nacional) sem mapa próprio.
 * São mantidas no catálogo para fontes, mas não entram nos filtros do mapa.
 */
export const REGION_SCOPE_VALUES = [
  "cidade",
  "estado",
  "nacional",
] as const;

export type RegionSlug = (typeof REGION_VALUES)[number];

export const REGION_COLORS: Record<RegionSlug, string> = {
  centro: "#1d4ed8",
  "zona-sul": "#0d9488",
  "zona-norte": "#7c3aed",
  "zona-oeste": "#ea580c",
  "zona-sudoeste": "#dc2626",
  ilhas: "#db2777",
  cidade: "#57534e",
  estado: "#475569",
  nacional: "#7c3aed",
};

export const REGION_META: Record<
  RegionSlug,
  { name: string; description: string; sortOrder: number }
> = {  centro: {
    name: "Centro",
    description: "Centro histórico, portuário e administrativo do Rio.",
    sortOrder: 10,
  },
  "zona-sul": {
    name: "Zona Sul",
    description: "Orla, bairros residenciais e corredores da Zona Sul.",
    sortOrder: 20,
  },
  "zona-norte": {
    name: "Zona Norte",
    description: "Bairros e corredores da Zona Norte.",
    sortOrder: 30,
  },
  "zona-oeste": {
    name: "Zona Oeste",
    description: "Barra, Recreio, Jacarepaguá, Campo Grande e adjacências.",
    sortOrder: 40,
  },
  "zona-sudoeste": {
    name: "Zona Sudoeste",
    description: "Barra da Tijuca, Recreio, Jacarepaguá e bairros vizinhos.",
    sortOrder: 45,
  },
  ilhas: {
    name: "Ilhas",
    description: "Ilha do Governador, Fundão, Paquetá e demais ilhas.",
    sortOrder: 50,
  },
  cidade: {
    name: "Cidade do Rio",
    description: "Fontes de abrangência municipal, sem ponto único.",
    sortOrder: 60,
  },
  estado: {
    name: "Estado do Rio",
    description: "Fontes estaduais que cobrem todo o território fluminense.",
    sortOrder: 70,
  },
  nacional: {
    name: "Nacional",
    description: "Fontes federais de abrangência nacional.",
    sortOrder: 80,
  },
};

export const NEWS_KIND_VALUES = ["headline", "channel"] as const;

export type NewsKind = (typeof NEWS_KIND_VALUES)[number];

export const NEWS_KIND_META: Record<
  NewsKind,
  { label: string; description: string }
> = {
  headline: {
    label: "Notícia",
    description: "Item coletado de um feed público. Somente título, veículo, data e link.",
  },
  channel: {
    label: "Canal oficial",
    description: "Página oficial cadastrada manualmente, sem coleta de conteúdo.",
  },
};

export const NEWS_FEEDS = [
  {
    id: "prefeitura-rio",
    publisher: "Prefeitura do Rio",
    url: "https://prefeitura.rio/feed/",
    defaultRegion: "cidade",
  },
  {
    id: "cor-rio",
    publisher: "COR-Rio",
    url: "https://cor.rio/feed/",
    defaultRegion: "cidade",
  },
  {
    id: "ufrj",
    publisher: "UFRJ",
    url: "https://ufrj.br/feed/",
    defaultRegion: "ilhas",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  publisher: string;
  url: string;
  defaultRegion: RegionSlug;
}>;

export const SORT_VALUES = ["relevance", "name", "updated", "region"] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevância" },
  { value: "name", label: "Nome" },
  { value: "updated", label: "Atualização" },
  { value: "region", label: "Região" },
] as const satisfies ReadonlyArray<{ value: SortOption; label: string }>;

export type SortOption = (typeof SORT_VALUES)[number];

export const TAG_LABELS: Record<string, string> = {
  transito: "Trânsito",
  clima: "Clima",
  alertas: "Alertas",
  interdicoes: "Interdições",
  mobilidade: "Mobilidade",
  ponte: "Ponte Rio-Niterói",
  cameras: "Câmeras",
  monitoramento: "Monitoramento",
  universidade: "Universidade",
  praias: "Praias",
  balneabilidade: "Balneabilidade",
  agua: "Água",
  mapa: "Mapa",
  cheias: "Cheias",
  chuvas: "Chuvas",
  alagamentos: "Alagamentos",
  pluviometros: "Pluviômetros",
  rios: "Rios",
  drenagem: "Drenagem",
  geotecnia: "Geotecnia",
  risco: "Risco",
  ar: "Qualidade do ar",
  saude: "Saúde",
  deslizamentos: "Deslizamentos",
  emergencia: "Emergência",
  previsao: "Previsão",
  dados: "Dados abertos",
  mare: "Maré",
  mar: "Mar",
  navegacao: "Navegação",
  servicos: "Serviços",
  denuncias: "Denúncias",
  atendimento: "Atendimento",
  geoinformacao: "Geoinformação",
  api: "API",
  governo: "Governo",
  noticias: "Notícias",
  aeroporto: "Aeroporto",
  voos: "Voos",
  porto: "Porto",
  logistica: "Logística",
  metro: "Metrô",
  transporte: "Transporte",
  brt: "BRT",
  esgoto: "Esgoto",
  infraestrutura: "Infraestrutura",
  energia: "Energia",
  ocorrencias: "Ocorrências",
  gas: "Gás",
  emergencias: "Emergências",
};

export const CATALOG_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
export const CATALOG_CITY = "Rio de Janeiro";
export const CATALOG_STATE = "RJ";
export const CATALOG_LAST_CHECKED_AT = "2026-10-31";

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORY_VALUES.includes(value as Category);
}

export function isPermissionStatus(value: unknown): value is PermissionStatus {
  return (
    typeof value === "string" &&
    PERMISSION_STATUS_VALUES.includes(value as PermissionStatus)
  );
}

export function isAvailabilityStatus(
  value: unknown,
): value is AvailabilityStatus {
  return (
    typeof value === "string" &&
    AVAILABILITY_STATUS_VALUES.includes(value as AvailabilityStatus)
  );
}

export function isMediaType(value: unknown): value is MediaType {
  return (
    typeof value === "string" && MEDIA_TYPE_VALUES.includes(value as MediaType)
  );
}

export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && SCOPE_VALUES.includes(value as Scope);
}

export function isRegionSlug(value: unknown): value is RegionSlug {
  return (
    typeof value === "string" && REGION_VALUES.includes(value as RegionSlug)
  );
}

export function isSortOption(value: unknown): value is SortOption {
  return (
    typeof value === "string" &&
    SORT_OPTIONS.some((option) => option.value === value)
  );
}

/** Janelas de chuva expostas pela API do Alerta Rio (acumulados em mm). */
export const RAIN_METRIC_VALUES = [
  "mm_5m",
  "mm_10m",
  "mm_15m",
  "mm_1h",
  "mm_4h",
  "mm_24h",
  "mm_96h",
  "mm_month",
] as const;

export type RainMetric = (typeof RAIN_METRIC_VALUES)[number];

export const RAIN_METRIC_LABELS: Record<RainMetric, string> = {
  mm_5m: "últimos 5 min",
  mm_10m: "últimos 10 min",
  mm_15m: "últimos 15 min",
  mm_1h: "última hora",
  mm_4h: "últimas 4 h",
  mm_24h: "últimas 24 h",
  mm_96h: "últimas 96 h",
  mm_month: "no mês",
};

/** Camadas de risco derivadas de fontes oficiais. */
export const RISK_KIND_VALUES = ["flood_ismfi"] as const;

export type RiskKind = (typeof RISK_KIND_VALUES)[number];

export const RISK_KIND_LABELS: Record<RiskKind, string> = {
  flood_ismfi: "Índice de suscetibilidade a inundação (ISMFI)",
};

export const RISK_CLASS_VALUES = [
  "nao_avaliado",
  "baixa",
  "media",
  "alta",
] as const;

export type RiskClass = (typeof RISK_CLASS_VALUES)[number];

export const RISK_CLASS_LABELS: Record<RiskClass, string> = {
  nao_avaliado: "Não avaliado",
  baixa: "Baixo",
  media: "Médio",
  alta: "Alto",
};

/** Tipo de dispositivo inferido pelo User-Agent (sem guardar o UA). */
export const DEVICE_VALUES = [
  "mobile",
  "tablet",
  "desktop",
  "unknown",
] as const;

export type DeviceType = (typeof DEVICE_VALUES)[number];

export const DEVICE_LABELS: Record<DeviceType, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Desconhecido",
};

/** Estágio operacional da cidade (atualizado manualmente no admin). */
export const CITY_STAGE_VALUES = [
  "normal",
  "atencao",
  "alerta",
  "crise",
] as const;

export type CityStage = (typeof CITY_STAGE_VALUES)[number];

export const CITY_STAGE_LABELS: Record<CityStage, string> = {
  normal: "Normal",
  atencao: "Atenção",
  alerta: "Alerta",
  crise: "Crise",
};

