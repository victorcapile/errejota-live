import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { usageEvents } from "@/db/schema";
import { detectDevice } from "@/lib/device";
import { getClientIp } from "@/lib/request-ip";

const EVENT_TYPES = new Set([
  "page_view",
  "neighborhood_view",
  "camera_click",
] as const);

type EventType = "page_view" | "neighborhood_view" | "camera_click";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    type?: unknown;
    sessionId?: unknown;
    neighborhoodSlug?: unknown;
    cameraId?: unknown;
    cameraName?: unknown;
    path?: unknown;
  };

  const type =
    typeof body.type === "string" && EVENT_TYPES.has(body.type as EventType)
      ? (body.type as EventType)
      : null;

  if (!type) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
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
  const userAgent = request.headers.get("user-agent") ?? "";
  const visitorHash = rawIp
    ? createHash("sha256")
        .update(
          `${rawIp}|${userAgent}:${process.env.IP_HASH_SALT ?? "errejota-local-ip"}`,
        )
        .digest("hex")
    : null;
  const device = detectDevice(request.headers.get("user-agent"));

  try {
    await db.insert(usageEvents).values({
      id: `usage_${randomUUID()}`,
      type,
      device,
      sessionId,
      // Em produção guardamos apenas o hash pseudônimo; o IP cru fica local.
      ip: process.env.NODE_ENV === "production" ? null : rawIp,
      ipHash,
      visitorHash,
      neighborhoodSlug: clean(body.neighborhoodSlug, 80),
      cameraId: clean(body.cameraId, 120),
      cameraName: clean(body.cameraName, 160),
      path: clean(body.path, 200),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao registrar evento de uso:", error);
    // Estatística não pode quebrar a experiência do mapa.
    return NextResponse.json(
      { ok: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
