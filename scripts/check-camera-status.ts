/**
 * Verifica o estado (online/offline) das câmeras usando o endpoint de sessão do
 * provedor, através da rota interna `/api/cameras/status`.
 *
 * Uso:
 *   npm run db:status                      # checa todas as câmeras ainda sem status
 *   npm run db:status -- --region=centro   # só uma região
 *   npm run db:status -- --neighborhood=freguesia-jacarepagua
 *   npm run db:status -- --all             # recheca todas (inclusive já checadas)
 *   npm run db:status -- --limit=30 --delay=600
 *
 * O servidor precisa estar rodando (npm run dev). O script não abre o banco
 * local diretamente: o PGlite só aceita um processo por vez.
 */
import type {
  CameraStatusBatchReport,
  CameraStatusSummary,
} from "../src/lib/camera-status";

type Options = {
  limit: number;
  delayMs: number;
  region: string | null;
  neighborhood: string | null;
  onlyUnknown: boolean;
  maxBatches: number;
  baseUrl: string;
  token: string | null;
};

function readFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function readNumber(name: string, fallback: number): number {
  const raw = readFlag(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const options: Options = {
  limit: readNumber("limit", 25),
  delayMs: Math.max(readNumber("delay", 600), 250),
  region: readFlag("region"),
  neighborhood: readFlag("neighborhood"),
  onlyUnknown: !process.argv.includes("--all"),
  maxBatches: Math.floor(readNumber("max-batches", 0)),
  baseUrl: readFlag("url") ?? process.env.APP_URL ?? "http://localhost:3000",
  token: readFlag("token") ?? process.env.CAMERA_STATUS_TOKEN ?? null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function headers(): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    result["x-status-token"] = options.token;
  }
  return result;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${options.baseUrl}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} em ${path}: ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

async function main() {
  console.log(
    `Verificando câmeras em ${options.baseUrl} (lote ${options.limit}, intervalo ${options.delayMs}ms${
      options.region ? `, região ${options.region}` : ""
    }${options.neighborhood ? `, bairro ${options.neighborhood}` : ""})…`,
  );

  let batches = 0;
  let checked = 0;
  let online = 0;
  let offline = 0;
  let unknown = 0;
  let targetTotal: number | null = null;

  while (true) {
    let report: CameraStatusBatchReport;

    try {
      report = await fetchJson<CameraStatusBatchReport>("/api/cameras/status", {
        method: "POST",
        body: JSON.stringify({
          limit: options.limit,
          delayMs: options.delayMs,
          onlyUnknown: options.onlyUnknown,
          region: options.region,
          neighborhood: options.neighborhood,
        }),
      });
    } catch (error) {
      console.error("Falha na verificação:", error);
      process.exitCode = 1;
      return;
    }

    batches += 1;
    checked += report.checked;
    online += report.online;
    offline += report.offline;
    unknown += report.unknown;
    if (targetTotal === null) {
      targetTotal = report.total;
    }

    const remaining = options.onlyUnknown
      ? report.remaining
      : Math.max((targetTotal ?? 0) - checked, 0);

    console.log(
      `  lote ${batches}: ${report.checked} checadas · ${report.online} online · ${report.offline} offline · ${report.unknown} desconhecidas · ${remaining} restantes`,
    );

    for (const result of report.results) {
      if (result.status === "offline") {
        console.log(`    offline: ${result.externalId} — ${result.name}`);
      }
    }

    if (report.rateLimited) {
      console.log("  Provedor pediu para desacelerar; aguardando 30s…");
      await sleep(30_000);
      continue;
    }

    if (report.checked === 0) {
      break;
    }

    if (options.onlyUnknown && report.remaining === 0) {
      break;
    }

    if (
      !options.onlyUnknown &&
      targetTotal !== null &&
      checked >= targetTotal
    ) {
      break;
    }

    if (options.maxBatches > 0 && batches >= options.maxBatches) {
      console.log(`Limite de ${options.maxBatches} lotes atingido.`);
      break;
    }
  }

  const summary = await fetchJson<CameraStatusSummary>("/api/cameras/status");
  console.log("\nResumo da execução:");
  console.log(
    `  ${checked} câmeras checadas · ${online} online · ${offline} offline · ${unknown} desconhecidas`,
  );
  console.log(
    `  banco: ${summary.total} câmeras · ${summary.online} online · ${summary.offline} offline · ${summary.unknown} sem status`,
  );
}

main().catch((error) => {
  console.error("Falha ao verificar as câmeras:", error);
  process.exit(1);
});
