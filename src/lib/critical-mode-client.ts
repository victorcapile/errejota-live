import type { CriticalModeView } from "./critical-mode";
import { fetchJsonWithRetry } from "./fetch-client";

const CACHE_TTL_MS = 20_000;

let cache: { data: CriticalModeView; expiresAt: number } | null = null;
let inflight: Promise<CriticalModeView | null> | null = null;

/**
 * Busca o estágio/modo avançado uma vez e compartilha o resultado entre o
 * banner do header e o mapa. Evita duas requisições simultâneas no mesmo load.
 */
export async function fetchCriticalMode(
  force = false,
): Promise<CriticalModeView | null> {
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) {
    return cache.data;
  }
  if (inflight) {
    return inflight;
  }

  inflight = fetchJsonWithRetry<CriticalModeView>("/api/critical-mode", {
    retries: 2,
    timeoutMs: 12_000,
    init: { cache: "no-store" },
  })
    .then((data) => {
      cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateCriticalModeCache(): void {
  cache = null;
}
