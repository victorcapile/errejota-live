export type ReverseGeocodeResult = {
  street: string | null;
  neighborhood: string | null;
  displayName: string | null;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "errejota.live/1.0 (+https://github.com/victorcapile/errejota-live)";
const TIMEOUT_MS = 3_000;
const MIN_INTERVAL_MS = 1_100;

const cache = new Map<string, ReverseGeocodeResult | null>();
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

async function requestReverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "pt-BR");

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const address = data.address ?? {};

    const street =
      address.road ??
      address.pedestrian ??
      address.footway ??
      address.path ??
      address.residential ??
      address.cycleway ??
      null;
    const neighborhood =
      address.suburb ??
      address.neighbourhood ??
      address.city_district ??
      address.quarter ??
      address.borough ??
      null;

    return {
      street,
      neighborhood,
      displayName: data.display_name ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Geocodificação reversa via Nominatim/OpenStreetMap, com cache em memória e
 * fila de 1 requisição por segundo (política de uso do serviço).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const key = cacheKey(latitude, longitude);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const run = queue.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();

    const result = await requestReverseGeocode(latitude, longitude);
    cache.set(key, result);
    if (cache.size > 500) {
      const first = cache.keys().next().value;
      if (first) {
        cache.delete(first);
      }
    }
    return result;
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
