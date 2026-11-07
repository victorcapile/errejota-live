import { NextResponse } from "next/server";
import {
  SAFETY_FACILITY_KIND_VALUES,
  type SafetyFacilityKind,
} from "@/lib/constants";
import { listSafetyFacilities } from "@/lib/safety";

export const maxDuration = 30;

const CACHE = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind") ?? "all";
  const kind =
    kindParam === "all" ||
    SAFETY_FACILITY_KIND_VALUES.includes(kindParam as SafetyFacilityKind)
      ? (kindParam as SafetyFacilityKind | "all")
      : "all";
  const region = url.searchParams.get("region")?.trim() || undefined;
  const neighborhood =
    url.searchParams.get("neighborhood")?.trim() || undefined;
  const limitParam = Number.parseInt(
    url.searchParams.get("limit") ?? "1000",
    10,
  );

  try {
    const result = await listSafetyFacilities({
      kind,
      region,
      neighborhood,
      limit: Number.isFinite(limitParam) ? limitParam : 1000,
    });
    return NextResponse.json(
      {
        ...result,
        sources: {
          support_point: "defesa-civil-rio",
          shelter: "defesa-civil-rio",
          hospital: "cnes-datasus",
        },
      },
      { headers: CACHE },
    );
  } catch (error) {
    console.error("Falha ao listar equipamentos de segurança:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar os equipamentos." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
