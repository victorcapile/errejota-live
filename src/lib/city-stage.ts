import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemState } from "@/db/schema";
import {
  CITY_STAGE_COLORS,
  CITY_STAGE_DESCRIPTIONS,
  CITY_STAGE_LABELS,
  CITY_STAGE_SHORT_LABELS,
  normalizeCityStage,
} from "./constants";
import type { CityStageStatus, CityStageView } from "./types";

/**
 * Estágio operacional oficial da cidade.
 *
 * Prioridade:
 * 1. override manual ativo do admin (system_state.stage_override);
 * 2. fonte oficial do COR-Rio;
 * 3. "dados indisponíveis" (nunca inventar "normal").
 *
 * O override manual é explícito e permanece até ser removido no admin.
 */

const COR_STAGE_URL = "https://appcor.cor-rio.work/estagio_cidade";
const STAGE_OVERRIDE_KEY = "stage_override";
const CACHE_TTL_MS = 60_000;
const UNAVAILABLE_CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

type CorStagePayload = {
  cor?: unknown;
  estagio?: unknown;
  mensagem?: unknown;
  mensagem2?: unknown;
  id?: unknown;
  inicio?: unknown;
};

type CachedStage = {
  stage: CityStageView;
  status: CityStageStatus;
  fetchedAt: string;
  expiresAt: number;
};

let cache: CachedStage | null = null;

function validIso(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stageMessage(payload: CorStagePayload): string | null {
  const parts = [payload.mensagem, payload.mensagem2]
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function parseCorStage(payload: CorStagePayload): CityStageView {
  // O campo `estagio` é o rótulo oficial ("Estágio 1".."5"). O `id` do
  // payload pode ser um identificador interno e não acompanhar o nível
  // (ex.: id 1 com "Estágio 2"). Por isso o rótulo tem prioridade.
  const stage =
    normalizeCityStage(payload.estagio) ?? normalizeCityStage(payload.id);

  if (!stage) {
    return null;
  }

  const color =
    typeof payload.cor === "string" && /^#[0-9a-f]{6}$/i.test(payload.cor)
      ? payload.cor
      : CITY_STAGE_COLORS[stage];

  return {
    stage,
    label: CITY_STAGE_LABELS[stage],
    color,
    message: stageMessage(payload),
    sourceLabel: "COR-Rio",
    effectiveAt: validIso(payload.inicio) ?? new Date().toISOString(),
  };
}

async function fetchCorStage(): Promise<CityStageView> {
  const response = await fetch(COR_STAGE_URL, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "errejota.live (monitoramento de estágio operacional)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao consultar o estágio do COR.`);
  }

  const payload = (await response.json()) as CorStagePayload;
  const stage = parseCorStage(payload);
  if (!stage) {
    throw new Error("Payload do estágio do COR sem estágio válido.");
  }
  return stage;
}

type StageOverridePayload = {
  stage?: unknown;
  message?: unknown;
  sourceLabel?: unknown;
  effectiveAt?: unknown;
};

async function fetchStageOverride(): Promise<CityStageView> {
  try {
    const [row] = await db
      .select()
      .from(systemState)
      .where(eq(systemState.key, STAGE_OVERRIDE_KEY))
      .limit(1);

    if (!row?.value) {
      return null;
    }

    const parsed = JSON.parse(row.value) as StageOverridePayload;
    const stage = normalizeCityStage(parsed.stage);
    if (!stage) {
      return null;
    }

    return {
      stage,
      label: CITY_STAGE_LABELS[stage],
      color: CITY_STAGE_COLORS[stage],
      message: text(parsed.message),
      sourceLabel:
        text(parsed.sourceLabel) ?? "Atualização manual (admin)",
      effectiveAt: validIso(parsed.effectiveAt) ?? row.updatedAt,
    };
  } catch (error) {
    console.error("[stage] override manual inválido:", error);
    return null;
  }
}

export function invalidateCityStageCache(): void {
  cache = null;
}

export async function getCityStage(force = false): Promise<{
  stage: CityStageView;
  status: CityStageStatus;
  fetchedAt: string;
}> {
  const now = Date.now();

  // O override é lido do banco em toda chamada para valer imediatamente
  // em todos os módulos/rotas, mesmo com o cache do COR aquecido.
  const override = await fetchStageOverride();
  if (override) {
    return {
      stage: override,
      status: "fallback" as const,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!force && cache && cache.expiresAt > now) {
    return {
      stage: cache.stage,
      status: cache.status,
      fetchedAt: cache.fetchedAt,
    };
  }

  try {
    const stage = await fetchCorStage();
    const result = {
      stage,
      status: "ok" as const,
      fetchedAt: new Date().toISOString(),
    };
    cache = { ...result, expiresAt: now + CACHE_TTL_MS };
    return result;
  } catch (error) {
    console.error("[stage] fonte oficial indisponível:", error);

    const result = {
      stage: null,
      status: "unavailable" as const,
      fetchedAt: new Date().toISOString(),
    };
    cache = { ...result, expiresAt: now + UNAVAILABLE_CACHE_TTL_MS };
    return result;
  }
}

/** Compatibilidade com chamadas antigas. */
export async function getLatestCityStage(): Promise<CityStageView> {
  const result = await getCityStage();
  return result.stage;
}

export function cityStageDescription(stage: string): string {
  const normalized = normalizeCityStage(stage);
  return normalized ? CITY_STAGE_DESCRIPTIONS[normalized] : "";
}

export function cityStageShortLabel(stage: string): string {
  const normalized = normalizeCityStage(stage);
  return normalized ? CITY_STAGE_SHORT_LABELS[normalized] : stage;
}
