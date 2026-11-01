import { listSources } from "@/lib/catalog";
import { parseApiCatalogQuery } from "@/lib/catalog-params";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseApiCatalogQuery(url.searchParams);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Parâmetros inválidos.",
        issues: parsed.issues,
      },
      { status: 400 },
    );
  }

  try {
    const result = await listSources(parsed.data);
    return Response.json(result);
  } catch (error) {
    console.error("Falha ao listar fontes:", error);
    return Response.json(
      { error: "Não foi possível consultar o catálogo." },
      { status: 500 },
    );
  }
}
