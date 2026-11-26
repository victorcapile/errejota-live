/**
 * Fetch de JSON com timeout e novas tentativas para falhas transitórias.
 *
 * O primeiro carregamento do mapa pode coincidir com um cold start da API ou
 * com uma conexão instável. Sem retry, um único 5xx deixava câmeras e
 * equipamentos vazios até o usuário recarregar a página.
 */
class NonRetryableFetchError extends Error {}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchJsonWithRetry<T>(
  url: string,
  options: {
    signal?: AbortSignal;
    retries?: number;
    timeoutMs?: number;
    init?: RequestInit;
  } = {},
): Promise<T> {
  const {
    signal,
    retries = 3,
    timeoutMs = 15_000,
    init,
  } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(init?.headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }

      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = `HTTP ${response.status} em ${url}`;
        const retryable =
          response.status >= 500 ||
          response.status === 408 ||
          response.status === 429;
        throw retryable
          ? new Error(message)
          : new NonRetryableFetchError(message);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (signal?.aborted) {
        throw error;
      }
      if (error instanceof NonRetryableFetchError) {
        throw error;
      }
      if (attempt >= retries) {
        break;
      }

      await sleep(400 * 2 ** attempt + Math.random() * 200);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao carregar dados.");
}
