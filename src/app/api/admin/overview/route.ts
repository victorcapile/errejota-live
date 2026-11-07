import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listCameras, listManualStages } from "@/lib/admin-data";
import { getCameraStatusSummary } from "@/lib/camera-status";
import { getCityStage } from "@/lib/city-stage";
import { getCriticalMode } from "@/lib/critical-mode";
import {
  CAMERA_REPORT_REASON_VALUES,
  CAMERA_REPORT_STATUS_VALUES,
  type CameraReportReason,
  type CameraReportStatus,
} from "@/lib/constants";
import { getLastIngestRun, listRainReadings } from "@/lib/rain";
import { getReportCounts, listAudit, listReports } from "@/lib/reports";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401, headers: NO_STORE },
    );
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? "pending";
  const reasonParam = url.searchParams.get("reason") ?? "all";
  const query = url.searchParams.get("q") ?? "";
  const cameraStatusParam = url.searchParams.get("cameraStatus") ?? "all";

  const status =
    statusParam === "all" ||
    CAMERA_REPORT_STATUS_VALUES.includes(statusParam as CameraReportStatus)
      ? (statusParam as CameraReportStatus | "all")
      : "pending";
  const reason =
    reasonParam === "all" ||
    CAMERA_REPORT_REASON_VALUES.includes(reasonParam as CameraReportReason)
      ? (reasonParam as CameraReportReason | "all")
      : "all";
  const cameraStatus =
    cameraStatusParam === "online" ||
    cameraStatusParam === "offline" ||
    cameraStatusParam === "unknown"
      ? cameraStatusParam
      : "all";

  try {
    const reports = await listReports({ status, reason, query, limit: 120 });
    const counts = await getReportCounts();
    const cameraSummary = await getCameraStatusSummary();
    const cameraList = await listCameras({
      query,
      status: cameraStatus,
      limit: 120,
    });
    const stage = await getCityStage();
    const criticalMode = await getCriticalMode();
    const manualStages = await listManualStages();
    const rain = await listRainReadings({ limit: 120 });
    const lastRainRun = await getLastIngestRun("rain");
    const audit = await listAudit(20);

    return NextResponse.json(
      {
        reports,
        counts,
        cameraSummary,
        cameras: cameraList,
        stage,
        criticalMode,
        manualStages,
        rain,
        lastRainRun,
        audit,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Falha ao carregar o admin:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o admin." },
      { status: 500, headers: NO_STORE },
    );
  }
}
