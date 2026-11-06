import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "errejota_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_ID = /^[a-zA-Z0-9-]{8,64}$/;

/**
 * Garante um identificador anônimo estável por navegador antes do JS carregar.
 * Assim duas abas abertas juntas não criam IDs diferentes para a presença.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (existing && VALID_ID.test(existing)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2?|css|js|json|geojson)).*)",
  ],
};
