import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { normalizeIp } from "@/lib/request-ip";

const COOKIE_NAME = "errejota_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;

const ADMIN_USER = process.env.ADMIN_USER ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return "errejota-local-admin-session";
  }
  throw new Error("ADMIN_SESSION_SECRET não configurado.");
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_MAX_AGE_SECONDS = Math.floor(SESSION_MS / 1000);
export const ADMIN_RATE_LIMIT_MAX_ATTEMPTS = RATE_LIMIT_MAX_ATTEMPTS;

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** IPs públicos autorizados a acessar o admin. */
const ALLOWED_IPS = new Set(
  (process.env.ADMIN_ALLOWED_IPS ?? "")
    .split(/[\s,;]+/)
    .map(normalizeIp)
    .filter(Boolean),
);

/** IP real do cliente. Na Vercel, x-real-ip é definido pela plataforma. */
export async function getRequestIp(): Promise<string> {
  const requestHeaders = await headers();

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) {
    return normalizeIp(realIp);
  }

  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    // A última entrada é a adicionada pelo proxy confiável.
    const parts = forwarded.split(",").filter((part) => part.trim());
    const last = parts[parts.length - 1] ?? "";
    return normalizeIp(last);
  }

  return "";
}

function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "::1" ||
    host.startsWith("[::1]")
  );
}

function isLoopbackIp(ip: string): boolean {
  return ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip.startsWith("127.");
}

/**
 * Requisição direta no próprio computador.
 * O dev server e a Vercel adicionam x-forwarded-for; por isso o IP
 * encaminhado precisa ser de loopback para valer como local.
 */
export async function isLocalRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").toLowerCase();

  if (!isLoopbackHost(host)) {
    return false;
  }

  const ip = await getRequestIp();
  return ip === "" || isLoopbackIp(ip);
}

/**
 * O admin só existe para requisições locais ou para IPs da allowlist.
 * Configure ADMIN_ALLOWED_IPS com o IP público do seu computador.
 */
export async function isAdminHostAllowed(): Promise<boolean> {
  if (await isLocalRequest()) {
    return true;
  }
  const ip = await getRequestIp();
  return ip !== "" && ALLOWED_IPS.has(ip);
}

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

function pruneLoginAttempts(now: number): void {
  if (loginAttempts.size < 500) {
    return;
  }
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) {
      loginAttempts.delete(key);
    }
  }
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  pruneLoginAttempts(now);

  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (attempt.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function registerFailedLogin(key: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }
  attempt.count += 1;
}

export function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export function isValidAdminCredentials(
  user: string,
  password: string,
): boolean {
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return false;
  }
  return safeEqual(user, ADMIN_USER) && safeEqual(password, ADMIN_PASSWORD);
}

export function createAdminToken(): string {
  const payload = `admin.${Date.now() + SESSION_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  const [role, expiresAt, signature] = token.split(".");
  if (!role || !expiresAt || !signature) {
    return false;
  }
  const payload = `${role}.${expiresAt}`;
  if (!safeEqual(signature, sign(payload))) {
    return false;
  }
  const expiration = Number(expiresAt);
  return role === "admin" && Number.isFinite(expiration) && expiration > Date.now();
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!(await isAdminHostAllowed())) {
    return false;
  }
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(COOKIE_NAME)?.value);
}
