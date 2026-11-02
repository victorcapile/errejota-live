/**
 * Marca manualmente uma câmera como online, offline ou sem status.
 *
 * Uso:
 *   npm run db:camera:set -- --search="AEROPORTO SANTOS DUMONT"
 *   npm run db:camera:set -- 004827 offline
 *   npm run db:camera:set -- --id=004827 --status=online
 *   npm run db:camera:set -- 004827 unknown   # limpa o status
 *
 * O servidor precisa estar rodando. O script usa a rota interna
 * `/api/cameras/status/manual`, que grava direto na tabela `cameras`.
 */
import { normalizeText } from "../src/lib/text";

type Camera = {
  externalId: string;
  name: string;
  neighborhoodName: string | null;
  regionName: string | null;
  isOnline: boolean | null;
};

function readFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function positional(): string[] {
  return process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
}

const STATUS_ALIASES: Record<string, "online" | "offline" | "unknown"> = {
  online: "online",
  on: "online",
  true: "online",
  "1": "online",
  ativa: "online",
  ativo: "online",
  funcionando: "online",
  offline: "offline",
  off: "offline",
  false: "offline",
  "0": "offline",
  inativa: "offline",
  inativo: "offline",
  fora: "offline",
  unknown: "unknown",
  "sem-status": "unknown",
  limpar: "unknown",
  clear: "unknown",
  null: "unknown",
};

const baseUrl = readFlag("url") ?? process.env.APP_URL ?? "http://localhost:3000";
const token = readFlag("token") ?? process.env.CAMERA_STATUS_TOKEN ?? null;
const args = positional();
const statusInput = readFlag("status") ?? args[1] ?? null;
const status = statusInput
  ? STATUS_ALIASES[statusInput.toLowerCase()]
  : null;
const search = readFlag("search");
const allInput = readFlag("all");
const allStatus = allInput ? STATUS_ALIASES[allInput.toLowerCase()] : null;
const externalId = readFlag("id") ?? (search ? null : args[0] ?? null);

function headers(): Record<string, string> {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (token) result["x-status-token"] = token;
  return result;
}

function formatStatus(value: boolean | null): string {
  if (value === true) return "online";
  if (value === false) return "offline";
  return "sem status";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

async function searchCameras(term: string) {
  const payload = await fetchJson<{ items?: Camera[] }>("/api/cameras");
  const needle = normalizeText(term);
  const matches = (payload.items ?? [])
    .filter((camera) => normalizeText(camera.name).includes(needle))
    .slice(0, 25);

  if (matches.length === 0) {
    console.log(`Nenhuma câmera encontrada para "${term}".`);
    return;
  }

  console.log(`${matches.length} câmera(s) encontrada(s):\n`);
  for (const camera of matches) {
    const where = [camera.neighborhoodName, camera.regionName]
      .filter(Boolean)
      .join(" · ");
    console.log(
      `  ${camera.externalId}  ${camera.name}  [${formatStatus(camera.isOnline)}]${
        where ? `  (${where})` : ""
      }`,
    );
  }

  if (matches.length === 1 && status) {
    await applyStatus(matches[0].externalId, status);
  } else if (matches.length > 1) {
    console.log(
      "\nUse --id=<externalId> --status=<online|offline|unknown> para alterar uma delas.",
    );
  }
}

async function applyStatus(id: string, nextStatus: "online" | "offline" | "unknown") {
  const result = await fetchJson<{
    updated: number;
    notFound: string[];
    cameras: Array<{ externalId: string; name: string; isOnline: boolean | null }>;
  }>("/api/cameras/status/manual", {
    method: "POST",
    body: JSON.stringify({ externalId: id, status: nextStatus }),
  });

  for (const camera of result.cameras) {
    console.log(
      `Atualizada: ${camera.externalId} — ${camera.name} → ${formatStatus(
        camera.isOnline,
      )}`,
    );
  }
  if (result.notFound.length > 0) {
    console.log(`Não encontrada(s): ${result.notFound.join(", ")}`);
  }
  if (result.updated === 0 && result.notFound.length === 0) {
    console.log("Nenhuma câmera atualizada.");
  }
}

async function applyAllStatus(
  nextStatus: "online" | "offline" | "unknown",
) {
  const result = await fetchJson<{
    updated: number;
    status: string;
    isOnline: boolean | null;
  }>("/api/cameras/status/manual", {
    method: "POST",
    body: JSON.stringify({ all: nextStatus }),
  });

  console.log(
    `${result.updated} câmeras atualizadas → ${formatStatus(result.isOnline)}.`,
  );
}

async function main() {
  if (allInput) {
    if (!allStatus) {
      console.error(
        `Status inválido para --all. Use --all=online, --all=offline ou --all=unknown.`,
      );
      process.exitCode = 1;
      return;
    }
    await applyAllStatus(allStatus);
    return;
  }

  if (search) {
    await searchCameras(search);
    return;
  }

  if (!externalId) {
    console.log(
      [
        "Uso:",
        '  npm run db:camera:set -- --search="NOME DA CÂMERA"',
        "  npm run db:camera:set -- 004827 offline",
        "  npm run db:camera:set -- --id=004827 --status=online",
        "  npm run db:camera:set -- --all=online   # todas de uma vez",
        "",
        "Status: online, offline, unknown (limpa).",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (!status) {
    console.error(
      `Status inválido. Use online, offline ou unknown (recebido: ${
        statusInput ?? "nada"
      }).`,
    );
    process.exitCode = 1;
    return;
  }

  await applyStatus(externalId, status);
}

main().catch((error) => {
  console.error("Falha ao atualizar a câmera:", error);
  process.exit(1);
});
