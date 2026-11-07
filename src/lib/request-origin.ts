/**
 * Bloqueia POSTs cross-site de navegadores (CSRF). Requisições sem `Origin`
 * (scripts, apps nativos, curl) continuam permitidas; o cookie do admin é
 * HttpOnly + SameSite=Lax, então o navegador não o envia em POST cross-site.
 */
export function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
