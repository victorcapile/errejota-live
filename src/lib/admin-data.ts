import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { cameras, cityStages, systemState } from "@/db/schema";
import { invalidateCityStageCache } from "./city-stage";
import {
  CITY_STAGE_COLORS,
  CITY_STAGE_LABELS,
  normalizeCityStage,
  type CityStage,
} from "./constants";
import { logAdminAction } from "./reports";

const STAGE_OVERRIDE_KEY = "stage_override";

export type AdminCamera = {
  id: string;
  externalId: string;
  name: string;
  pageUrl: string;
  providerName: string;
  neighborhoodSlug: string | null;
  regionSlug: string | null;
  isOnline: boolean | null;
  updatedAt: string;
};

export type CameraFilters = {
  query?: string;
  status?: "all" | "online" | "offline" | "unknown";
  limit?: number;
};

export async function listCameras(
  filters: CameraFilters = {},
): Promise<AdminCamera[]> {
  const conditions = [];

  if (filters.query?.trim()) {
    const query = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(cameras.name, query),
        ilike(cameras.externalId, query),
        ilike(cameras.neighborhoodSlug, query),
      ),
    );
  }
  if (filters.status === "online") {
    conditions.push(eq(cameras.isOnline, true));
  }
  if (filters.status === "offline") {
    conditions.push(eq(cameras.isOnline, false));
  }
  if (filters.status === "unknown") {
    conditions.push(isNull(cameras.isOnline));
  }

  return db
    .select({
      id: cameras.id,
      externalId: cameras.externalId,
      name: cameras.name,
      pageUrl: cameras.pageUrl,
      providerName: cameras.providerName,
      neighborhoodSlug: cameras.neighborhoodSlug,
      regionSlug: cameras.regionSlug,
      isOnline: cameras.isOnline,
      updatedAt: cameras.updatedAt,
    })
    .from(cameras)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(cameras.name))
    .limit(Math.min(Math.max(filters.limit ?? 120, 1), 500));
}

export type ManualStageView = {
  id: string;
  stage: CityStage;
  label: string;
  color: string;
  message: string | null;
  sourceLabel: string;
  effectiveAt: string;
};

export async function listManualStages(limit = 6): Promise<ManualStageView[]> {
  const rows = await db
    .select()
    .from(cityStages)
    .orderBy(desc(cityStages.effectiveAt))
    .limit(Math.min(Math.max(limit, 1), 20));

  return rows
    .map((row) => {
      const stage = normalizeCityStage(row.stage);
      if (!stage) {
        return null;
      }
      return {
        id: row.id,
        stage,
        label: CITY_STAGE_LABELS[stage],
        color: CITY_STAGE_COLORS[stage],
        message: row.message,
        sourceLabel: row.sourceLabel,
        effectiveAt: row.effectiveAt,
      };
    })
    .filter((row): row is ManualStageView => row !== null);
}

export async function createManualStage(input: {
  stage: CityStage;
  message?: string | null;
  sourceLabel?: string | null;
  actor?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const stage = normalizeCityStage(input.stage);
  if (!stage) {
    return { ok: false, error: "Estágio inválido." };
  }

  const now = new Date().toISOString();
  const sourceLabel = input.sourceLabel?.trim() || "Atualização manual (admin)";
  const message = input.message?.trim() || null;

  await db.insert(cityStages).values({
    id: `stage_${randomUUID()}`,
    stage,
    message,
    sourceLabel,
    effectiveAt: now,
    createdBy: input.actor ?? "admin",
    createdAt: now,
  });

  const overrideValue = JSON.stringify({
    stage,
    message,
    sourceLabel,
    effectiveAt: now,
  });
  await db
    .insert(systemState)
    .values({
      key: STAGE_OVERRIDE_KEY,
      value: overrideValue,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: systemState.key,
      set: { value: overrideValue, updatedAt: now },
    });
  invalidateCityStageCache();

  await logAdminAction({
    action: "stage_set",
    entity: "city_stage",
    detail: `${CITY_STAGE_LABELS[stage]}${message ? `: ${message}` : ""}`,
    actor: input.actor,
  });

  return { ok: true };
}

/** Remove o override ativo e volta a priorizar o COR-Rio. */
export async function clearManualStageOverride(
  actor?: string,
): Promise<void> {
  await db.delete(systemState).where(eq(systemState.key, STAGE_OVERRIDE_KEY));
  invalidateCityStageCache();
  await logAdminAction({
    action: "stage_clear",
    entity: "city_stage",
    detail: "Voltou ao COR-Rio",
    actor,
  });
}
