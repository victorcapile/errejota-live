import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";

export const maxDuration = 60;

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function POST(request: Request) {
  if (request.headers.get("x-diag-token") !== process.env.DIAG_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    failIds?: unknown;
    okIds?: unknown;
  };

  const failIds = Array.isArray(body.failIds)
    ? body.failIds.filter((id): id is string => typeof id === "string")
    : [];
  const okIds = Array.isArray(body.okIds)
    ? body.okIds.filter((id): id is string => typeof id === "string")
    : [];

  const before = await db
    .select({ externalId: cameras.externalId, isOnline: cameras.isOnline })
    .from(cameras)
    .orderBy(cameras.externalId);

  const now = new Date().toISOString();

  for (const batch of chunks(failIds, 400)) {
    await db
      .update(cameras)
      .set({ isOnline: false, updatedAt: now })
      .where(inArray(cameras.externalId, batch));
  }

  for (const batch of chunks(okIds, 400)) {
    await db
      .update(cameras)
      .set({ isOnline: true, updatedAt: now })
      .where(inArray(cameras.externalId, batch));
  }

  const after = await db
    .select({ isOnline: cameras.isOnline })
    .from(cameras);

  const online = after.filter((row) => row.isOnline === true).length;
  const offline = after.filter((row) => row.isOnline === false).length;

  return NextResponse.json({
    before,
    after: { total: after.length, online, offline },
    updated: { fail: failIds.length, ok: okIds.length },
  });
}
