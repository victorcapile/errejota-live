/**
 * Normaliza IPv4/IPv6 e remove porta, colchetes e prefixo ::ffff:.
 * Todo loopback vira 127.0.0.1 para que F5/reaberturas não criem
 * visitantes diferentes no ambiente local.
 */
export function normalizeIp(value: string): string {
  let ip = value.trim().toLowerCase();
  if (!ip) {
    return "";
  }

  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end !== -1) {
      ip = ip.slice(1, end);
    }
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }

  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip.startsWith("127.")) {
    return "127.0.0.1";
  }

  return ip;
}

/** IP real do cliente. Na Vercel, x-real-ip é definido pela plataforma. */
export function getClientIp(request: Request): string | null {
  const real = request.headers.get("x-real-ip");
  if (real) {
    const value = normalizeIp(real);
    return value ? value.slice(0, 64) : null;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // A última entrada é a adicionada pelo proxy confiável.
    const parts = forwarded.split(",").filter((part) => part.trim());
    const last = normalizeIp(parts[parts.length - 1] ?? "");
    return last ? last.slice(0, 64) : null;
  }

  return null;
}
