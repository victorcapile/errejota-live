import {
  AVAILABILITY_STATUS_META,
  CATEGORY_META,
  LOCATION_PRECISION_META,
  MEDIA_TYPE_META,
  PERMISSION_STATUS_META,
  PROVIDER_KIND_META,
  SCOPE_META,
  type AvailabilityStatus,
  type PermissionStatus,
} from "./constants";
import type { Source } from "./types";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Não informada";
  }

  const normalized = value.length === 10 ? `${value}T12:00:00.000Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

export function canEmbed(source: Pick<
  Source,
  "permissionStatus" | "embedUrl" | "mediaType"
>): boolean {
  return (
    source.permissionStatus === "verified" &&
    source.embedUrl !== null &&
    source.mediaType !== "external_page"
  );
}

export function availabilityLabel(
  status: AvailabilityStatus,
  mediaType: Source["mediaType"],
): string {
  if (mediaType === "external_page" && status === "online") {
    return "Página respondeu";
  }
  return AVAILABILITY_STATUS_META[status].shortLabel;
}

export function permissionLabel(status: PermissionStatus): string {
  return PERMISSION_STATUS_META[status].shortLabel;
}

export function categoryLabel(source: Pick<Source, "category">): string {
  return CATEGORY_META[source.category].label;
}

export function locationLabel(source: Source): string {
  if (source.neighborhood) {
    return source.neighborhood.name;
  }
  if (source.addressHint) {
    return source.addressHint;
  }
  if (source.scope === "city") {
    return "Cidade do Rio de Janeiro";
  }
  if (source.scope === "state") {
    return "Estado do Rio de Janeiro";
  }
  if (source.scope === "national") {
    return "Brasil";
  }
  return "Localização não informada";
}

export function sourceMeta(source: Source): string {
  const pieces = [
    source.providerName,
    source.region?.name,
    locationLabel(source),
  ].filter(Boolean);
  return Array.from(new Set(pieces)).join(" · ");
}

export function mediaLabel(source: Pick<Source, "mediaType">): string {
  return MEDIA_TYPE_META[source.mediaType].label;
}

export function scopeLabel(source: Pick<Source, "scope">): string {
  return SCOPE_META[source.scope].label;
}

export function precisionLabel(source: Pick<Source, "locationPrecision">): string {
  return LOCATION_PRECISION_META[source.locationPrecision].label;
}

export function providerKindLabel(source: Pick<Source, "providerKind">): string {
  return PROVIDER_KIND_META[source.providerKind].label;
}

export function coordinatesLabel(source: Pick<
  Source,
  "latitude" | "longitude"
>): string | null {
  if (source.latitude === null || source.longitude === null) {
    return null;
  }
  return `${source.latitude.toFixed(4)}, ${source.longitude.toFixed(4)}`;
}

export function openStreetMapUrl(source: Pick<
  Source,
  "latitude" | "longitude"
>): string | null {
  if (source.latitude === null || source.longitude === null) {
    return null;
  }
  return `https://www.openstreetmap.org/?mlat=${source.latitude}&mlon=${source.longitude}#map=15/${source.latitude}/${source.longitude}`;
}
