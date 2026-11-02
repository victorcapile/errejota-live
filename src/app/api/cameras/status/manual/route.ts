import {
  setAllCameraStatuses,
  setCameraStatuses,
  type CameraStatusUpdate,
  type ManualCameraStatus,
} from "@/lib/camera-status";

const STATUSES: ManualCameraStatus[] = ["online", "offline", "unknown"];

function isManualStatus(value: unknown): value is ManualCameraStatus {
  return typeof value === "string" && STATUSES.includes(value as ManualCameraStatus);
}

export async function POST(request: Request) {
  const expectedToken = process.env.CAMERA_STATUS_TOKEN;
  const authorized =
    process.env.NODE_ENV !== "production" ||
    (Boolean(expectedToken) &&
      request.headers.get("x-status-token") === expectedToken);

  if (!authorized) {
    return Response.json(
      { error: "Defina CAMERA_STATUS_TOKEN e envie o cabeçalho x-status-token." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    externalId?: unknown;
    status?: unknown;
    updates?: unknown;
    all?: unknown;
  };

  if (isManualStatus(body.all)) {
    try {
      const result = await setAllCameraStatuses(body.all);
      return Response.json(result);
    } catch (error) {
      console.error("Falha ao atualizar todas as câmeras:", error);
      return Response.json(
        { error: "Não foi possível atualizar todas as câmeras." },
        { status: 500 },
      );
    }
  }

  const rawUpdates = Array.isArray(body.updates)
    ? body.updates
    : [{ externalId: body.externalId, status: body.status }];

  const updates: CameraStatusUpdate[] = [];
  for (const raw of rawUpdates) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { externalId?: unknown; status?: unknown };
    if (typeof item.externalId !== "string" || item.externalId.trim() === "") {
      continue;
    }
    if (!isManualStatus(item.status)) continue;
    updates.push({
      externalId: item.externalId.trim(),
      status: item.status,
    });
  }

  if (updates.length === 0) {
    return Response.json(
      {
        error:
          "Envie { externalId, status }, { updates: [{ externalId, status }] } ou { all: 'online' | 'offline' | 'unknown' }. Status aceitos: online, offline, unknown.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await setCameraStatuses(updates);
    return Response.json(result);
  } catch (error) {
    console.error("Falha ao atualizar o status manual das câmeras:", error);
    return Response.json(
      { error: "Não foi possível atualizar o status das câmeras." },
      { status: 500 },
    );
  }
}
