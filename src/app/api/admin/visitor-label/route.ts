import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorLabels } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const VISITOR_KEY_PATTERN = /^[a-f0-9]{64}$/;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    visitorKey?: unknown;
    nickname?: unknown;
  };

  const visitorKey =
    typeof body.visitorKey === "string" ? body.visitorKey.trim() : "";
  const nickname =
    typeof body.nickname === "string"
      ? body.nickname.trim().slice(0, 40)
      : "";

  if (!VISITOR_KEY_PATTERN.test(visitorKey)) {
    return NextResponse.json(
      { error: "Visitante inválido." },
      { status: 400 },
    );
  }

  try {
    if (!nickname) {
      await db
        .delete(visitorLabels)
        .where(eq(visitorLabels.visitorKey, visitorKey));
      return NextResponse.json(
        { ok: true, nickname: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = new Date().toISOString();
    await db
      .insert(visitorLabels)
      .values({ visitorKey, nickname, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: visitorLabels.visitorKey,
        set: { nickname, updatedAt: now },
      });

    return NextResponse.json(
      { ok: true, nickname },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao salvar apelido do visitante:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o apelido." },
      { status: 500 },
    );
  }
}
