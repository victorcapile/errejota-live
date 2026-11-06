import { NextResponse } from "next/server";
import { pruneUsageData } from "@/lib/usage";

export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await pruneUsageData();
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao limpar dados antigos:", error);
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
