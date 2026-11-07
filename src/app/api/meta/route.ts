import { getCatalogMeta } from "@/lib/catalog";

const CACHE = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const meta = await getCatalogMeta();
    return Response.json(meta, { headers: CACHE });
  } catch (error) {
    console.error("Falha ao consultar metadados:", error);
    return Response.json(
      { error: "Não foi possível consultar os metadados do catálogo." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
