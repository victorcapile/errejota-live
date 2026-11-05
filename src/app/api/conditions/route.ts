import { getLastIngestRun, listNeighborhoodConditions } from "@/lib/rain";
import { conditionsQueryFromUrl } from "@/lib/rain-params";

const CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
};

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
    const [result, lastRun] = await Promise.all([
      listNeighborhoodConditions({
        region: parsed.query.region,
        neighborhood: parsed.query.neighborhood,
        metric: parsed.query.metric,
        limit: parsed.query.limit,
      }),
      getLastIngestRun("rain"),
    ]);
    return Response.json(
      {
        metric: parsed.query.metric,
        sources: {
          rain: "alerta-rio",
          risk: "coppe-ufrj",
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
