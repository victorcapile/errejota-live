import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit, cameraReports } from "@/db/schema";
import {
  CAMERA_REPORT_STATUS_VALUES,
  type CameraReportReason,
  type CameraReportStatus,
} from "./constants";
import { setCameraStatuses } from "./camera-status";

export type CameraReportSummary = {
  id: string;
  cameraId: string;
  cameraExternalId: string | null;
  cameraName: string;
  reason: CameraReportReason;
  note: string | null;
  status: CameraReportStatus;
  createdAt: string;
  updatedAt: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
  moderationNote: string | null;
  ipHash: string | null;
  saltVersion: string | null;
};

export type ReportFilters = {
  status?: CameraReportStatus | "all";
  reason?: CameraReportReason | "all";
  query?: string;
  limit?: number;
};

export type ReportCounts = Record<CameraReportStatus, number> & {
  total: number;
};

export async function listReports(
  filters: ReportFilters = {},
): Promise<CameraReportSummary[]> {
  const conditions = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(cameraReports.status, filters.status));
  }
  if (filters.reason && filters.reason !== "all") {
    conditions.push(eq(cameraReports.reason, filters.reason));
  }
  if (filters.query?.trim()) {
    const query = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(cameraReports.cameraName, query),
        ilike(cameraReports.cameraExternalId, query),
      ),
    );
  }

  const rows = await db
    .select()
    .from(cameraReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cameraReports.createdAt))
    .limit(Math.min(Math.max(filters.limit ?? 100, 1), 500));

  return rows.map((row) => ({
    ...row,
    reason: row.reason as CameraReportReason,
    status: row.status as CameraReportStatus,
  }));
}

export async function getReportCounts(): Promise<ReportCounts> {
  const counts: ReportCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    resolved: 0,
    duplicate: 0,
    total: 0,
  };

  const rows = await db
    .select({ status: cameraReports.status, value: count() })
    .from(cameraReports)
    .groupBy(cameraReports.status);

  for (const row of rows) {
    const status = row.status as CameraReportStatus;
    if (CAMERA_REPORT_STATUS_VALUES.includes(status)) {
      const value = Number(row.value ?? 0);
      counts[status] = value;
      counts.total += value;
    }
  }

  return counts;
}

export async function logAdminAction(input: {
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  actor?: string;
}): Promise<void> {
  await db.insert(adminAudit).values({
    id: `audit_${randomUUID()}`,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    detail: input.detail ?? null,
    actor: input.actor ?? "admin",
    createdAt: new Date().toISOString(),
  });
}

export async function listAudit(limit = 30) {
  return db
    .select()
    .from(adminAudit)
    .orderBy(desc(adminAudit.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export type ModerationAction =
  | "approve"
  | "reject"
  | "resolve"
  | "duplicate";

const ACTION_STATUS: Record<ModerationAction, CameraReportStatus> = {
  approve: "approved",
  reject: "rejected",
  resolve: "resolved",
  duplicate: "duplicate",
};

export async function moderateReport(input: {
  id: string;
  action: ModerationAction;
  note?: string | null;
  applyStatus?: "online" | "offline" | "unknown" | null;
  actor?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const [report] = await db
    .select()
    .from(cameraReports)
    .where(eq(cameraReports.id, input.id))
    .limit(1);

  if (!report) {
    return { ok: false, error: "Relato não encontrado." };
  }

  const status = ACTION_STATUS[input.action];
  if (!status) {
    return { ok: false, error: "Ação inválida." };
  }

  const now = new Date().toISOString();
  const moderationNote = input.note?.trim() || null;

  await db
    .update(cameraReports)
    .set({
      status,
      moderatedBy: input.actor ?? "admin",
      moderatedAt: now,
      moderationNote,
      updatedAt: now,
    })
    .where(eq(cameraReports.id, report.id));

  if (
    input.action === "approve" &&
    input.applyStatus &&
    report.cameraExternalId
  ) {
    await setCameraStatuses([
      { externalId: report.cameraExternalId, status: input.applyStatus },
    ]);
    await logAdminAction({
      action: "camera_status",
      entity: "camera",
      entityId: report.cameraExternalId,
      detail: `Status aplicado via relato ${report.id}: ${input.applyStatus}`,
      actor: input.actor,
    });
  }

  await logAdminAction({
    action: `report_${input.action}`,
    entity: "camera_report",
    entityId: report.id,
    detail: moderationNote,
    actor: input.actor,
  });

  return { ok: true };
}

/** Conta relatos recentes do mesmo hash para o rate limit durável. */
export async function countRecentReportsByHash(
  ipHash: string,
  sinceIso: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(cameraReports)
    .where(
      and(
        eq(cameraReports.ipHash, ipHash),
        gte(cameraReports.createdAt, sinceIso),
      ),
    );

  return Number(row?.value ?? 0);
}

export async function findRecentDuplicate(
  dedupeKey: string,
  sinceIso: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: cameraReports.id })
    .from(cameraReports)
    .where(
      and(
        eq(cameraReports.dedupeKey, dedupeKey),
        gte(cameraReports.createdAt, sinceIso),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function insertReport(input: {
  cameraId: string;
  cameraExternalId: string | null;
  cameraName: string;
  reason: CameraReportReason;
  note: string | null;
  ipHash: string | null;
  saltVersion: string | null;
  dedupeKey: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(cameraReports).values({
    id: `report_${randomUUID()}`,
    cameraId: input.cameraId,
    cameraExternalId: input.cameraExternalId,
    cameraName: input.cameraName,
    reason: input.reason,
    note: input.note,
    status: "pending",
    ipHash: input.ipHash,
    saltVersion: input.saltVersion,
    dedupeKey: input.dedupeKey,
    createdAt: now,
    updatedAt: now,
  });
}
