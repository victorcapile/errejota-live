import { NextResponse } from "next/server";
import { isAdminHostAllowed } from "@/lib/admin-auth";

export async function GET() {
  const allowed = await isAdminHostAllowed();

  return NextResponse.json(
    { allowed },
    { headers: { "Cache-Control": "no-store" } },
  );
}
