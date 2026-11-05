import { listCameras } from "@/lib/catalog";
import { isRegionSlug } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") ?? undefined;
  const neighborhood = url.searchParams.get("neighborhood") ?? undefined;

  if (region && !isRegionSlug(region)) {
    return Response.json(
      { error: "Região inválida.", issues: [{ path: "region" }] },
      { status: 400 },
    );
  }

  try {
    const items = await listCameras({ region, neighborhood });
    return Response.json({ items, total: items.length });
  } catch (error) {
    console.error("Falha ao listar câmeras:", error);
    return Response.json(
      { error: "Não foi possível consultar as câmeras." },
      { status: 500 },
    );
  }
}
