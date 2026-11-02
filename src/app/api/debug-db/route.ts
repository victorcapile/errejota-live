import { sql } from "drizzle-orm";
import { db } from "@/db";

const QUERIES: Record<string, () => Promise<unknown>> = {
  select1: () => db.execute(sql`select 1 as ok`),
  cameras_count: () => db.execute(sql`select count(*)::int as n from cameras`),
  sources_count: () => db.execute(sql`select count(*)::int as n from sources`),
  neighborhoods_count: () =>
    db.execute(sql`select count(*)::int as n from neighborhoods`),
  regions_count: () => db.execute(sql`select count(*)::int as n from regions`),
  tags_count: () => db.execute(sql`select count(*)::int as n from tags`),
  sources_select: () =>
    db.execute(sql`select id, name from sources order by name limit 1`),
  sources_group: () =>
    db.execute(
      sql`select category, count(*)::int as n from sources group by category`,
    ),
  sources_max: () =>
    db.execute(sql`select max(last_checked_at) as value from sources`),
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "select1";
  const run = QUERIES[query];

  if (!run) {
    return Response.json(
      { error: `Consulta desconhecida: ${query}`, available: Object.keys(QUERIES) },
      { status: 400 },
    );
  }

  const started = Date.now();

  try {
    const result = await Promise.race([
      run(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout de 8s")), 8_000),
      ),
    ]);

    return Response.json({
      query,
      ok: true,
      ms: Date.now() - started,
      result,
    });
  } catch (error) {
    return Response.json({
      query,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
