import { getSourceBySlug } from "@/lib/catalog";

const CACHE = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const source = await getSourceBySlug(slug);
    if (!source) {
      return Response.json(
        { error: "Fonte não encontrada." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(source, { headers: CACHE });
  } catch (error) {
    console.error(`Falha ao consultar a fonte ${slug}:`, error);
    return Response.json(
      { error: "Não foi possível consultar a fonte." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
