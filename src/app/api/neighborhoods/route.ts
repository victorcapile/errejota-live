import { listNeighborhoods } from "@/lib/catalog";
import { isRegionSlug } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  if (region && !isRegionSlug(region)) {
    return Response.json(
      { error: "Região inválida.", issues: [{ path: "region" }] },
      { status: 400 },
    );
  }

  try {
    const items = await listNeighborhoods({
      region,
      q: q ?? undefined,
    });
    return Response.json({ items, total: items.length });
  } catch (error) {
    console.error("Falha ao listar bairros:", error);
    return Response.json(
      { error: "Não foi possível consultar os bairros." },
      { status: 500 },
    );
  }
}
