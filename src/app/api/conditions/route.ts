import { getLastIngestRun, listNeighborhoodConditions } from "@/lib/rain";
import { ensureFreshRain } from "@/lib/ingest-rain";
import { conditionsQueryFromUrl } from "@/lib/rain-params";

// Sem cache: o primeiro acesso precisa disparar a verificação de frescor e
// devolver a leitura mais nova, não uma resposta guardada na CDN.
const CACHE = {
  "Cache-Control": "no-store",
};

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = conditionsQueryFromUrl(url);

  if (!parsed.ok) {
    return Response.json(
      { error: "Parâmetros inválidos.", issues: parsed.issues },
      { status: 400 },
    );
  }

  try {
    await ensureFreshRain();
    const result = await listNeighborhoodConditions({
      region: parsed.query.region,
      neighborhood: parsed.query.neighborhood,
      metric: parsed.query.metric,
      limit: parsed.query.limit,
    });
    const lastRun = await getLastIngestRun("rain");
    return Response.json(
      {
        metrics: ["mm_1h", "mm_24h", "mm_96h"],
        sources: {
          rain: "alerta-rio",
          risk: "coppe-ufrj",
          stage: "cor-rio",
        },
        lastRun,
        ...result,
      },
      { headers: CACHE },
    );
  } catch (error) {
    console.error("Falha ao listar condições:", error);
    return Response.json(
      { error: "Não foi possível consultar as condições por bairro." },
      { status: 500 },
    );
  }
}
