import type { DeviceType } from "./constants";

/**
 * Classifica o acesso em celular/tablet/desktop a partir do User-Agent.
 * Guardamos apenas a categoria, nunca o User-Agent completo.
 */
export function detectDevice(userAgent: string | null): DeviceType {
  if (!userAgent) {
    return "unknown";
  }

  const ua = userAgent.toLowerCase();

  if (
    /ipad|tablet|playbook|silk/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua))
  ) {
    return "tablet";
  }

  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) {
    return "mobile";
  }

  return "desktop";
}
