/**
 * Utilitários compartilhados pelos scripts de ingestão.
 *
 * Regras: sempre usar timeout, tentar de novo com backoff e validar o
 * payload antes de gravar qualquer coisa no banco.
 */

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 3;

export type FetchJsonOptions = {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Valida o payload; se lançar, a tentativa é repetida. */
  validate?: (data: unknown) => void;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    headers = {},
    validate,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", ...headers },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} em ${url}`);
      }

      const data = (await response.json()) as T;
      validate?.(data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = 500 * 2 ** attempt + Math.random() * 250;
        await sleep(delay);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `Falha ao baixar ${url} após ${retries + 1} tentativas: ${String(lastError)}`,
  );
}

/** Converte números do Alerta Rio ("0,0") e valores numéricos em number. */
export function parseDecimal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || normalized === "-") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
