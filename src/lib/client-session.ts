"use client";

const COOKIE_NAME = "errejota_session";
const STORAGE_KEY = "errejota-presence";
const VALID_ID = /^[a-zA-Z0-9-]{8,64}$/;

let cached: string | null = null;

function readCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(id: string): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem localStorage: o cookie e o cache em memória seguem valendo.
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Identificador anônimo e estável por navegador. Usa cookie + localStorage e
 * cache em memória, para que abas e componentes não gerem IDs diferentes.
 */
export function getClientSessionId(): string {
  if (cached) {
    return cached;
  }

  const cookie = readCookie();
  if (cookie && VALID_ID.test(cookie)) {
    cached = cookie;
    writeStorage(cookie);
    return cookie;
  }

  const stored = readStorage();
  if (stored && VALID_ID.test(stored)) {
    cached = stored;
    writeCookie(stored);
    return stored;
  }

  const created = createId();
  cached = created;
  writeCookie(created);
  writeStorage(created);
  return created;
}
