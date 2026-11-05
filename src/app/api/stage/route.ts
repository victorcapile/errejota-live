import { getLatestCityStage } from "@/lib/rain";

const CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const stage = await getLatestCityStage();
    return Response.json({ stage }, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao consultar o estágio da cidade:", error);
    return Response.json(
      { error: "Não foi possível consultar o estágio da cidade." },
      { status: 500 },
    );
  }
}
