import {
  RAIN_METRIC_VALUES,
  isRegionSlug,
  type RainMetric,
} from "./constants";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const DEFAULT_METRIC: RainMetric = "mm_1h";

export type ConditionsQuery = {
  region?: string;
  neighborhood?: string;
  metric: RainMetric;
  limit: number;
};

export type ConditionsQueryResult =
  | { ok: true; query: ConditionsQuery }
  | { ok: false; issues: string[] };

function readSlug(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

export function conditionsQueryFromUrl(url: URL): ConditionsQueryResult {
  const region = readSlug(url.searchParams.get("region"));
  const neighborhood = readSlug(url.searchParams.get("neighborhood"));
  const metricParam = readSlug(url.searchParams.get("metric"));
  const limitParam = url.searchParams.get("limit");

  const issues: string[] = [];
  if (region && !isRegionSlug(region)) {
    issues.push("region");
  }
  if (neighborhood && !SLUG_PATTERN.test(neighborhood)) {
    issues.push("neighborhood");
  }

  let metric = DEFAULT_METRIC;
  if (metricParam) {
    if (RAIN_METRIC_VALUES.includes(metricParam as RainMetric)) {
      metric = metricParam as RainMetric;
    } else {
      issues.push("metric");
    }
  }

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    query: {
      region: region || undefined,
      neighborhood: neighborhood || undefined,
      metric,
      limit,
    },
  };
}
