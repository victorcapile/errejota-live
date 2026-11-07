import { createHash } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";
import {
  CAMERA_REPORT_REASON_VALUES,
  type CameraReportReason,
} from "@/lib/constants";
import { getClientIp } from "@/lib/request-ip";
import { isSameOriginRequest } from "@/lib/request-origin";
import {
  countRecentReportsByHash,
  findRecentDuplicate,
  insertReport,
} from "@/lib/reports";

export const maxDuration = 30;

const MAX_NOTE = 500;
const MAX_BODY_BYTES = 10_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;

const NO_STORE = { "Cache-Control": "no-store" };

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function hash(value: string, salt: string): string {
  return createHash("sha256").update(`${value}:${salt}`).digest("hex");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Origem inválida." },
      { status: 403, headers: NO_STORE },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Requisição muito grande." },
      { status: 413, headers: NO_STORE },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    cameraId?: unknown;
    reason?: unknown;
    note?: unknown;
    website?: unknown;
  };

  // Honeypot: bots preenchem o campo escondido; devolvemos sucesso genérico.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const cameraId = clean(body.cameraId, 120);
  const reason =
    typeof body.reason === "string" &&
    CAMERA_REPORT_REASON_VALUES.includes(body.reason as CameraReportReason)
      ? (body.reason as CameraReportReason)
      : null;

  if (!cameraId || !reason) {
    return NextResponse.json(
      { error: "Dados do relato inválidos." },
      { status: 400, headers: NO_STORE },
    );
  }

  const [camera] = await db
    .select({
      id: cameras.id,
      externalId: cameras.externalId,
      name: cameras.name,
    })
    .from(cameras)
    .where(or(eq(cameras.id, cameraId), eq(cameras.externalId, cameraId)))
    .limit(1);

  if (!camera) {
    return NextResponse.json(
      { error: "Câmera não encontrada." },
      { status: 404, headers: NO_STORE },
    );
  }

  const rawIp =
    getClientIp(request) ||
    (process.env.NODE_ENV !== "production" ? "local" : null);
  const saltVersion = new Date().toISOString().slice(0, 10);
  const secret =
    process.env.REPORT_HASH_SALT ??
    process.env.IP_HASH_SALT ??
    process.env.ADMIN_SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Relatos temporariamente indisponíveis." },
      { status: 503, headers: NO_STORE },
    );
  }
  const salt = `${secret ?? "errejota-local-report"}:${saltVersion}`;
  const ipHash = rawIp ? hash(rawIp, salt) : null;
  const dedupeKey = ipHash
    ? hash(`${camera.id}|${reason}|${ipHash}`, salt)
    : null;

  if (ipHash) {
    const hourly = await countRecentReportsByHash(
      ipHash,
      new Date(Date.now() - HOUR_MS).toISOString(),
    );
    if (hourly >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: "Muitos relatos em pouco tempo. Tente mais tarde." },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": "3600" },
        },
      );
    }

    const daily = await countRecentReportsByHash(
      ipHash,
      new Date(Date.now() - DAY_MS).toISOString(),
    );
    if (daily >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: "Limite diário de relatos atingido." },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": "86400" },
        },
      );
    }

    if (
      dedupeKey &&
      (await findRecentDuplicate(
        dedupeKey,
        new Date(Date.now() - DAY_MS).toISOString(),
      ))
    ) {
      return NextResponse.json(
        { ok: true, duplicate: true },
        { headers: NO_STORE },
      );
    }
  }

  await insertReport({
    cameraId: camera.id,
    cameraExternalId: camera.externalId,
    cameraName: camera.name,
    reason,
    note: clean(body.note, MAX_NOTE),
    ipHash,
    saltVersion: ipHash ? saltVersion : null,
    dedupeKey,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
