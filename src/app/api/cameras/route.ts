import { listCameras } from "@/lib/catalog";
import { isRegionSlug } from "@/lib/constants";

const CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

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
    const items = (await listCameras({ region, neighborhood })).map(
      (camera) => ({
        id: camera.id,
        externalId: camera.externalId,
        name: camera.name,
        latitude: camera.latitude,
        longitude: camera.longitude,
        pageUrl: camera.pageUrl,
        providerName: camera.providerName,
        neighborhoodSlug: camera.neighborhoodSlug,
        neighborhoodName: camera.neighborhoodName,
        regionSlug: camera.regionSlug,
        regionName: camera.regionName,
        isOnline: camera.isOnline,
      }),
    );
    return Response.json({ items, total: items.length }, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao listar câmeras:", error);
    return Response.json(
      { error: "Não foi possível consultar as câmeras." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
