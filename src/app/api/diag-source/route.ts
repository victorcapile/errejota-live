import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: Request) {
  if (request.headers.get("x-diag-token") !== process.env.DIAG_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const response = await fetch(
      "https://alertario.rio.rj.gov.br/upload/Mapa/mc.json",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          Referer: "https://alertario.rio.rj.gov.br/mapa-de-chuvas/",
        },
      },
    );
    const text = await response.text();
    return NextResponse.json({
      status: response.status,
      contentType: response.headers.get("content-type"),
      isJson: text.trim().startsWith("{"),
      preview: text.slice(0, 140),
      ms: Date.now() - started,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error instanceof Error ? error.message : error),
      ms: Date.now() - started,
    });
  }
}
