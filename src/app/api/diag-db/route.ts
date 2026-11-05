import { NextResponse } from "next/server";
import postgres from "postgres";

export const maxDuration = 60;

const POOLER_HOST = "aws-0-sa-east-1.pooler.supabase.com";

type Probe = {
  ok: boolean;
  host?: string;
  port?: string;
  user?: string;
  database?: string;
  error?: string;
};

function describe(raw: string | undefined): Omit<Probe, "ok"> | null {
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port,
      user: url.username,
      database: url.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

async function probe(connection: string): Promise<Probe> {
  const details = describe(connection);
  const sql = postgres(connection, {
    prepare: false,
    max: 1,
    connect_timeout: 8,
    idle_timeout: 5,
  });

  try {
    await Promise.race([
      sql`select 1 as ok`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout local de 10s")), 10000);
      }),
    ]);
    return { ok: true, ...details };
  } catch (error) {
    return {
      ok: false,
      ...details,
      error: String(
        error instanceof Error ? error.message : error,
      ).slice(0, 200),
    };
  } finally {
    void sql.end({ timeout: 2 }).catch(() => {});
  }
}

export async function GET(request: Request) {
  if (request.headers.get("x-diag-token") !== process.env.DIAG_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const host = process.env.POSTGRES_HOST ?? "";
  const ref = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ?? "";
  const password = process.env.POSTGRES_PASSWORD ?? "";
  const database = process.env.POSTGRES_DATABASE ?? "postgres";
  const user = process.env.POSTGRES_USER ?? "postgres";

  const pooler =
    ref && password
      ? `postgresql://${user}.${ref}:${encodeURIComponent(
          password,
        )}@${POOLER_HOST}:6543/${database}?sslmode=require`
      : "";

  const raw = process.env.POSTGRES_URL ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const [rawProbe, poolerProbe, databaseProbe] = await Promise.all([
    raw ? probe(raw) : Promise.resolve({ ok: false, error: "sem URL" }),
    pooler
      ? probe(pooler)
      : Promise.resolve({ ok: false, error: "sem ref/senha" }),
    databaseUrl
      ? probe(databaseUrl)
      : Promise.resolve({ ok: false, error: "sem DATABASE_URL" }),
  ]);

  return NextResponse.json(
    {
      raw: rawProbe,
      databaseUrl: databaseProbe,
      hasDatabaseUrl: Boolean(databaseUrl),
      pooler: poolerProbe,
      postgresUrl: rawProbe.ok ? raw : null,
      poolerUrl: poolerProbe.ok ? pooler : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
