"use client";

import { getClientSessionId } from "@/lib/client-session";

type UsageEvent =
  | { type: "page_view"; path?: string }
  | { type: "neighborhood_view"; neighborhoodSlug: string; path?: string }
  | {
      type: "camera_click";
      cameraId: string;
      cameraName: string;
      neighborhoodSlug?: string | null;
    };

const recentCameraClicks = new Map<string, number>();
let lastLocationSentAt = 0;

export function trackUsage(event: UsageEvent): void {
  if (event.type === "camera_click") {
    const now = Date.now();
    const last = recentCameraClicks.get(event.cameraId);
    if (last && now - last < 10_000) {
      return;
    }
    recentCameraClicks.set(event.cameraId, now);
  }

  const payload = {
    ...event,
    sessionId: getClientSessionId(),
  };

  void fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Estatística é secundária; nunca deve atrapalhar a navegação.
  });
}

/**
 * Registra a coordenada somente quando o visitante pede para centralizar o
 * mapa e aceita a permissão de GPS do navegador.
 */
export function trackLocation(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): void {
  const now = Date.now();
  if (now - lastLocationSentAt < 5_000) {
    return;
  }
  lastLocationSentAt = now;

  void fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...coords,
      sessionId: getClientSessionId(),
    }),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Métrica secundária; nunca deve atrapalhar a navegação.
  });
}
