import { and, eq, isNotNull } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorLocations } from "@/db/schema";
import { detectDevice } from "@/lib/device";
import { reverseGeocode } from "@/lib/geocode";
import { getClientIp } from "@/lib/request-ip";

export const maxDuration = 30;

const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_ACCURACY_METERS = 100_000;
const WRITE_THROTTLE_MS = 5_000;

const recentWrites = new Map<string, number>();

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function shouldThrottle(key: string): boolean {
  const now = Date.now();
  const last = recentWrites.get(key);
  if (last && now - last < WRITE_THROTTLE_MS) {
    return true;
  }
  recentWrites.set(key, now);

  if (recentWrites.size > 1_000) {
    for (const [entry, timestamp] of recentWrites) {
      if (now - timestamp > WRITE_THROTTLE_MS) {
        recentWrites.delete(entry);
      }
    }
  }

  return false;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    latitude?: unknown;
    longitude?: unknown;
    accuracy?: unknown;
    sessionId?: unknown;
  };

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);

  if (!isValidCoordinate(latitude, longitude)) {
    return NextResponse.json(
      { error: "Coordenada inválida." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sessionId =
    typeof body.sessionId === "string" &&
    SESSION_ID_PATTERN.test(body.sessionId)
      ? body.sessionId
      : null;

  const rawIp =
    getClientIp(request) ??
    (process.env.NODE_ENV !== "production" ? "local" : null);
  const ipHash = rawIp
    ? createHash("sha256")
        .update(`${rawIp}:${process.env.IP_HASH_SALT ?? "errejota-local-ip"}`)
        .digest("hex")
    : null;

  const throttleKey = ipHash ?? sessionId ?? "anon";
  if (shouldThrottle(throttleKey)) {
    return NextResponse.json(
      { ok: true, skipped: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const device = detectDevice(request.headers.get("user-agent"));
  const placeKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

  let street: string | null = null;
  let neighborhood: string | null = null;

  try {
    const [cached] = await db
      .select({
        street: visitorLocations.street,
        neighborhood: visitorLocations.neighborhood,
      })
      .from(visitorLocations)
      .where(
        and(
          eq(visitorLocations.placeKey, placeKey),
          isNotNull(visitorLocations.street),
        ),
      )
      .limit(1);

    if (cached) {
      street = cached.street;
      neighborhood = cached.neighborhood;
    } else {
      const geo = await reverseGeocode(latitude, longitude);
      street = geo?.street ?? null;
      neighborhood = geo?.neighborhood ?? null;
    }
  } catch {
    // Sem geocodificação, a coordenada ainda é registrada.
  }

  try {
    await db.insert(visitorLocations).values({
      id: `location_${randomUUID()}`,
      sessionId,
      device,
      // Em produção guardamos apenas o hash pseudônimo; o IP cru fica local.
      ip: process.env.NODE_ENV === "production" ? null : rawIp,
      ipHash,
      latitude,
      longitude,
      accuracy:
        Number.isFinite(accuracy) && accuracy >= 0
          ? Math.min(accuracy, MAX_ACCURACY_METERS)
          : null,
      street,
      neighborhood,
      placeKey,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao registrar localização:", error);
    // Métrica secundária: nunca deve atrapalhar a navegação.
    return NextResponse.json(
      { ok: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
