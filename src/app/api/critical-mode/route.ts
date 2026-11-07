import { getCriticalMode } from "@/lib/critical-mode";

export const maxDuration = 30;

const CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const result = await getCriticalMode();
    return Response.json(result, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao consultar o modo crítico:", error);
    return Response.json(
      {
        active: false,
        since: null,
        stage: null,
        stageStatus: "unavailable",
        manualOverride: null,
        manualOverrideUntil: null,
        evaluatedAt: null,
        reason: "error",
      },
      { status: 200, headers: CACHE },
    );
  }
}
