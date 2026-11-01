import { getCatalogMeta } from "@/lib/catalog";

export async function GET() {
  try {
    const meta = await getCatalogMeta();
    return Response.json(meta);
  } catch (error) {
    console.error("Falha ao consultar metadados:", error);
    return Response.json(
      { error: "Não foi possível consultar os metadados do catálogo." },
      { status: 500 },
    );
  }
}
