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
    console.log("[cameras] rota iniciou");
    const items = await listCameras({ region, neighborhood });
    console.log("[cameras] listou", items.length);
    const body = Response.json({ items, total: items.length });
    console.log("[cameras] resposta pronta");
    return body;
  } catch (error) {
    console.error("Falha ao listar câmeras:", error);
    return Response.json(
      { error: "Não foi possível consultar as câmeras." },
      { status: 500 },
    );
  }
}
