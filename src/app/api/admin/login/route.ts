import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE_SECONDS,
  checkLoginRateLimit,
  clearLoginAttempts,
  createAdminToken,
  getRequestIp,
  isAdminHostAllowed,
  isValidAdminCredentials,
  registerFailedLogin,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!(await isAdminHostAllowed())) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const ip = await getRequestIp();
  const rateLimitKey = ip || "local";
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    user?: unknown;
    password?: unknown;
  };

  const user = typeof body.user === "string" ? body.user.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidAdminCredentials(user, password)) {
    registerFailedLogin(rateLimitKey);
    return NextResponse.json(
      { error: "Usuário ou senha inválidos." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  clearLoginAttempts(rateLimitKey);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
