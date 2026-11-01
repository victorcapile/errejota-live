import type {
  AvailabilityStatus,
  Category,
  LocationPrecision,
  MediaType,
  NewsKind,
  PermissionStatus,
  ProviderKind,
  Scope,
  SortOption,
} from "./constants";

export type RegionSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type NeighborhoodSummary = {
  id: string;
  slug: string;
  name: string;
  regionId: string;
  regionSlug: string;
  regionName: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  summary: string | null;
};

export type TagSummary = {
  id: string;
  slug: string;
  label: string;
};

export type Source = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: Category;
  providerName: string;
  providerKind: ProviderKind;
  sourcePageUrl: string;
  embedUrl: string | null;
  mediaType: MediaType;
  permissionStatus: PermissionStatus;
  availabilityStatus: AvailabilityStatus;
  statusNote: string | null;
  scope: Scope;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  addressHint: string | null;
  licenseNotes: string;
  termsUrl: string | null;
  attribution: string;
  lastCheckedAt: string | null;
  lastStatusChangeAt: string | null;
  isFeatured: boolean;
  isDemo: boolean;
  provenanceDataset: string | null;
  provenanceRecordId: string | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
  region: RegionSummary | null;
  neighborhood: NeighborhoodSummary | null;
  tags: TagSummary[];
};

export type NewsTopic =
  | "accident"
  | "closure"
  | "weather"
  | "event"
  | "news"
  | "channel";

export type NewsItem = {
  id: string;
  regionId: string;
  regionSlug: string;
  regionName: string;
  neighborhoodId: string | null;
  neighborhoodSlug: string | null;
  neighborhoodName: string | null;
  kind: NewsKind;
  topic: NewsTopic;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  fetchedAt: string;
};

export type StatusCheck = {
  id: string;
  checkedAt: string;
  status: AvailabilityStatus;
  httpStatus: number | null;
  errorCode: string | null;
  latencyMs: number | null;
  notes: string | null;
};

export type SourceDetail = Source & {
  statusChecks: StatusCheck[];
};

export type CatalogQuery = {
  q?: string;
  category?: Category;
  region?: string;
  neighborhood?: string;
  permission?: PermissionStatus;
  availability?: AvailabilityStatus;
  media?: MediaType;
  tag?: string;
  scope?: Scope;
  sort: SortOption;
  page: number;
  pageSize: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NeighborhoodWithCount = NeighborhoodSummary & {
  sourceCount: number;
};

export type Camera = {
  id: string;
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  pageUrl: string;
  providerName: string;
  neighborhoodSlug: string | null;
  neighborhoodName: string | null;
  regionSlug: string | null;
  regionName: string | null;
};

export type CameraImportReport = {
  totalRows: number;
  imported: number;
  skipped: number;
  locatedInNeighborhood: number;
  withoutNeighborhood: number;
  replaced: number;
  outsideRio: number;
  warnings: string[];
};

export type CatalogStats = {
  totalSources: number;
  totalNeighborhoods: number;
  totalRegions: number;
  totalTags: number;
  totalCameras: number;
  withCoordinates: number;
  featured: number;
  demo: number;
  byAvailability: Record<AvailabilityStatus, number>;
  byPermission: Record<PermissionStatus, number>;
  byScope: Record<Scope, number>;
  lastCheckedAt: string | null;
};

export type CatalogMeta = {
  categories: Array<{ value: Category; count: number }>;
  regions: Array<RegionSummary & { sourceCount: number }>;
  neighborhoods: NeighborhoodWithCount[];
  tags: Array<TagSummary & { sourceCount: number }>;
  stats: CatalogStats;
};
