import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { cameras } from "@/db/schema";

/**
 * Verificação do estado das câmeras.
 *
 * O provedor só informa se uma câmera está disponível quando o player pede uma
 * sessão de vídeo. Por isso a checagem faz uma única requisição leve ao endpoint
 * público de sessão usado pela própria página oficial:
 *
 * - `200` com `sessionId`  -> câmera online (a sessão é encerrada em seguida);
 * - `4xx`                  -> câmera indisponível/offline no provedor;
 * - `429`                  -> limite de requisições, tenta de novo mais tarde;
 * - rede/5xx               -> estado desconhecido (não marcamos offline).
 *
 * Nenhum vídeo é baixado, decodificado ou gravado. A checagem respeita um
 * intervalo entre requisições e para quando o provedor pede para desacelerar.
 */

const PROVIDER_BASE_URL = "https://appcor.cor-rio.work";
const PROVIDER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 15_000;
const RATE_LIMIT_PAUSE_MS = 20_000;
const DEFAULT_DELAY_MS = 600;

export type CameraStatus = "online" | "offline" | "unknown";

export type CameraStatusProbe = {
  id: string;
  externalId: string;
  name: string;
  status: CameraStatus;
  httpStatus: number | null;
  latencyMs: number;
  note: string | null;
};

type ProbeOutcome =
  | { status: "online"; httpStatus: 200; latencyMs: number }
  | { status: "offline"; httpStatus: number; latencyMs: number; note: string }
  | { status: "rate_limited"; latencyMs: number }
  | { status: "unknown"; httpStatus: number | null; latencyMs: number; note: string };

function sessionUrl(externalId: string): string {
  return `${PROVIDER_BASE_URL}/api/camera/player/session/start/${encodeURIComponent(
    externalId,
  )}/`;
}

async function stopSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${PROVIDER_BASE_URL}/api/camera/player/session/stop/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": PROVIDER_USER_AGENT,
      },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // A sessão expira sozinha; não bloqueia a checagem.
  }
}

async function probeCamera(camera: {
  externalId: string;
  pageUrl: string;
}): Promise<ProbeOutcome> {
  const startedAt = Date.now();

  try {
    const response = await fetch(sessionUrl(camera.externalId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": PROVIDER_USER_AGENT,
        Referer: camera.pageUrl || PROVIDER_BASE_URL,
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;
    const body = await response.text();

    if (response.status === 429) {
      return { status: "rate_limited", latencyMs };
    }

    if (response.status === 200) {
      let sessionId: string | null = null;
      try {
        sessionId = (JSON.parse(body) as { sessionId?: string }).sessionId ?? null;
      } catch {
        sessionId = null;
      }

      if (sessionId) {
        // Encerra a sessão em segundo plano para não somar latência à checagem.
        void stopSession(sessionId);
        return { status: "online", httpStatus: 200, latencyMs };
      }

      return {
        status: "unknown",
        httpStatus: 200,
        latencyMs,
        note: "Resposta sem sessionId.",
      };
    }

    if (response.status >= 400 && response.status < 500) {
      return {
        status: "offline",
        httpStatus: response.status,
        latencyMs,
        note: body.slice(0, 160) || `HTTP ${response.status}`,
      };
    }

    return {
      status: "unknown",
      httpStatus: response.status,
      latencyMs,
      note: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: "unknown",
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      note: error instanceof Error ? error.message : "Falha de rede",
    };
  }
}

export type CameraStatusBatchOptions = {
  limit?: number;
  onlyUnknown?: boolean;
  delayMs?: number;
  region?: string | null;
};

export type CameraStatusBatchReport = {
  checked: number;
  online: number;
  offline: number;
  unknown: number;
  remaining: number;
  rateLimited: boolean;
  results: CameraStatusProbe[];
};

function batchFilters(options: CameraStatusBatchOptions) {
  const filters = [];
  if (options.onlyUnknown !== false) {
    filters.push(isNull(cameras.isOnline));
  }
  if (options.region) {
    filters.push(eq(cameras.regionSlug, options.region));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

export async function runCameraStatusBatch(
  options: CameraStatusBatchOptions = {},
): Promise<CameraStatusBatchReport> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const delayMs = Math.max(options.delayMs ?? DEFAULT_DELAY_MS, 250);
  const where = batchFilters(options);

  const rows = await db
    .select({
      id: cameras.id,
      externalId: cameras.externalId,
      name: cameras.name,
      pageUrl: cameras.pageUrl,
    })
    .from(cameras)
    .where(where)
    .orderBy(asc(cameras.updatedAt), asc(cameras.externalId))
    .limit(limit);

  const results: CameraStatusProbe[] = [];
  const updates: Array<{ id: string; status: CameraStatus }> = [];
  let rateLimited = false;

  for (const [index, camera] of rows.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    let outcome = await probeCamera(camera);

    if (outcome.status === "rate_limited") {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE_MS));
      outcome = await probeCamera(camera);
    }

    if (outcome.status === "rate_limited") {
      rateLimited = true;
      results.push({
        id: camera.id,
        externalId: camera.externalId,
        name: camera.name,
        status: "unknown",
        httpStatus: 429,
        latencyMs: outcome.latencyMs,
        note: "Limite de requisições do provedor.",
      });
      break;
    }

    const status: CameraStatus =
      outcome.status === "online" || outcome.status === "offline"
        ? outcome.status
        : "unknown";

    results.push({
      id: camera.id,
      externalId: camera.externalId,
      name: camera.name,
      status,
      httpStatus: outcome.httpStatus ?? null,
      latencyMs: outcome.latencyMs,
      note: outcome.status === "unknown" || outcome.status === "offline"
        ? outcome.note
        : null,
    });

    updates.push({ id: camera.id, status });
  }

  if (updates.length > 0) {
    const timestamp = new Date().toISOString();
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(cameras)
          .set({
            ...(update.status === "unknown"
              ? {}
              : { isOnline: update.status === "online" }),
            updatedAt: timestamp,
          })
          .where(eq(cameras.id, update.id));
      }
    });
  }

  const remainingRows = await db
    .select({ value: count() })
    .from(cameras)
    .where(where);

  return {
    checked: results.length,
    online: results.filter((item) => item.status === "online").length,
    offline: results.filter((item) => item.status === "offline").length,
    unknown: results.filter((item) => item.status === "unknown").length,
    remaining: Number(remainingRows[0]?.value ?? 0),
    rateLimited,
    results,
  };
}

export type CameraStatusSummary = {
  total: number;
  online: number;
  offline: number;
  unknown: number;
};

export async function getCameraStatusSummary(): Promise<CameraStatusSummary> {
  const rows = await db
    .select({
      total: count(),
      online: sql<number>`count(*) filter (where ${cameras.isOnline} = true)`,
      offline: sql<number>`count(*) filter (where ${cameras.isOnline} = false)`,
    })
    .from(cameras);

  const row = rows[0];
  const total = Number(row?.total ?? 0);
  const online = Number(row?.online ?? 0);
  const offline = Number(row?.offline ?? 0);

  return {
    total,
    online,
    offline,
    unknown: Math.max(total - online - offline, 0),
  };
}

export type ManualCameraStatus = "online" | "offline" | "unknown";

export type CameraStatusUpdate = {
  externalId: string;
  status: ManualCameraStatus;
};

export type CameraStatusUpdateResult = {
  updated: number;
  notFound: string[];
  cameras: Array<{
    externalId: string;
    name: string;
    isOnline: boolean | null;
  }>;
};

/**
 * Atualiza o estado de câmeras manualmente. Use quando a observação humana for
 * mais confiável que a checagem automática (por exemplo, o player do provedor
 * mostra "offline" e a sessão ainda responde). `unknown` limpa o status.
 */
export async function setCameraStatuses(
  updates: CameraStatusUpdate[],
): Promise<CameraStatusUpdateResult> {
  const desired = new Map<string, ManualCameraStatus>();

  for (const update of updates) {
    const externalId =
      typeof update?.externalId === "string" ? update.externalId.trim() : "";
    if (!externalId) continue;
    if (!["online", "offline", "unknown"].includes(update.status)) continue;
    desired.set(externalId, update.status);
  }

  const externalIds = [...desired.keys()];
  if (externalIds.length === 0) {
    return { updated: 0, notFound: [], cameras: [] };
  }

  const rows = await db
    .select({
      id: cameras.id,
      externalId: cameras.externalId,
      name: cameras.name,
    })
    .from(cameras)
    .where(inArray(cameras.externalId, externalIds));

  const byExternalId = new Map(rows.map((row) => [row.externalId, row]));
  const notFound = externalIds.filter((id) => !byExternalId.has(id));
  const timestamp = new Date().toISOString();
  const updatedCameras: CameraStatusUpdateResult["cameras"] = [];

  await db.transaction(async (tx) => {
    for (const [externalId, status] of desired) {
      const row = byExternalId.get(externalId);
      if (!row) continue;

      const isOnline = status === "unknown" ? null : status === "online";
      await tx
        .update(cameras)
        .set({ isOnline, updatedAt: timestamp })
        .where(eq(cameras.id, row.id));

      updatedCameras.push({ externalId, name: row.name, isOnline });
    }
  });

  return {
    updated: updatedCameras.length,
    notFound,
    cameras: updatedCameras,
  };
}

export type CameraStatusBulkResult = {
  updated: number;
  status: ManualCameraStatus;
  isOnline: boolean | null;
};

/**
 * Aplica o mesmo estado a todas as câmeras. Útil para começar com tudo online
 * e depois marcar manualmente só as que estiverem offline.
 */
export async function setAllCameraStatuses(
  status: ManualCameraStatus,
): Promise<CameraStatusBulkResult> {
  const isOnline = status === "unknown" ? null : status === "online";
  const totalRows = await db.select({ value: count() }).from(cameras);
  const total = Number(totalRows[0]?.value ?? 0);

  await db.update(cameras).set({
    isOnline,
    updatedAt: new Date().toISOString(),
  });

  return { updated: total, status, isOnline };
}
