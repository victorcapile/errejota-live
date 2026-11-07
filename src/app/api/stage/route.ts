import { getCityStage } from "@/lib/city-stage";

const CACHE = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const result = await getCityStage();
    return Response.json(result, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao consultar o estágio da cidade:", error);
    return Response.json(
      { stage: null, status: "unavailable", fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
