import { listMapCameras } from "@/lib/catalog";
import { isRegionSlug } from "@/lib/constants";

// O catálogo de câmeras muda pouco; o status é atualizado pelo admin, não em
// tempo real. Um cache maior reduz egress e consultas pesadas no pico.
const CACHE = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
    const items = await listMapCameras({ region, neighborhood });
    return Response.json({ items, total: items.length }, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao listar câmeras:", error);
    return Response.json(
      { error: "Não foi possível consultar as câmeras." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
