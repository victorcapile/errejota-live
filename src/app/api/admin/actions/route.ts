import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  clearManualStageOverride,
  createManualStage,
} from "@/lib/admin-data";
import {
  setAllCameraStatuses,
  setCameraStatuses,
  type ManualCameraStatus,
} from "@/lib/camera-status";
import { normalizeCityStage, type CityStage } from "@/lib/constants";
import {
  logAdminAction,
  moderateReport,
  type ModerationAction,
} from "@/lib/reports";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

const MODERATION_ACTIONS: ModerationAction[] = [
  "approve",
  "reject",
  "resolve",
  "duplicate",
];

const MANUAL_STATUSES: ManualCameraStatus[] = [
  "online",
  "offline",
  "unknown",
];

function isManualStatus(value: unknown): value is ManualCameraStatus {
  return (
    typeof value === "string" &&
    MANUAL_STATUSES.includes(value as ManualCameraStatus)
  );
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401, headers: NO_STORE },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const type = typeof body.type === "string" ? body.type : "";

  if (type === "moderate_report") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action =
      typeof body.action === "string" &&
      MODERATION_ACTIONS.includes(body.action as ModerationAction)
        ? (body.action as ModerationAction)
        : null;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Relato ou ação inválidos." },
        { status: 400, headers: NO_STORE },
      );
    }

    const applyStatus = isManualStatus(body.applyStatus)
      ? body.applyStatus
      : null;
    const result = await moderateReport({
      id,
      action,
      note: typeof body.note === "string" ? body.note : null,
      applyStatus,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Não foi possível moderar o relato." },
        { status: 400, headers: NO_STORE },
      );
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (type === "set_camera_status") {
    const externalId =
      typeof body.externalId === "string" ? body.externalId.trim() : "";
    const status = body.status;

    if (!externalId || !isManualStatus(status)) {
      return NextResponse.json(
        { error: "Câmera ou status inválidos." },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await setCameraStatuses([{ externalId, status }]);
    await logAdminAction({
      action: "camera_status",
      entity: "camera",
      entityId: externalId,
      detail: `Status manual: ${status}`,
    });

    return NextResponse.json(
      { ok: true, ...result },
      { headers: NO_STORE },
    );
  }

  if (type === "set_all_cameras") {
    const status = body.status;
    if (!isManualStatus(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await setAllCameraStatuses(status);
    await logAdminAction({
      action: "camera_status_all",
      entity: "camera",
      detail: `Status aplicado a todas as câmeras: ${status}`,
    });

    return NextResponse.json(
      { ok: true, ...result },
      { headers: NO_STORE },
    );
  }

  if (type === "set_stage") {
    const stage = normalizeCityStage(body.stage) as CityStage | null;
    if (!stage) {
      return NextResponse.json(
        { error: "Estágio inválido." },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await createManualStage({
      stage,
      message: typeof body.message === "string" ? body.message : null,
      sourceLabel:
        typeof body.sourceLabel === "string" ? body.sourceLabel : null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Não foi possível salvar o estágio." },
        { status: 400, headers: NO_STORE },
      );
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (type === "clear_stage") {
    await clearManualStageOverride();
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  return NextResponse.json(
    { error: "Ação desconhecida." },
    { status: 400, headers: NO_STORE },
  );
}
