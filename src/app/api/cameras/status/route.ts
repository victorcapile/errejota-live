import {
  getCameraStatusSummary,
  runCameraStatusBatch,
} from "@/lib/camera-status";

export const maxDuration = 300;

export async function GET() {
  try {
    const summary = await getCameraStatusSummary();
    return Response.json(summary);
  } catch (error) {
    console.error("Falha ao resumir o status das câmeras:", error);
    return Response.json(
      { error: "Não foi possível consultar o status das câmeras." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const expectedToken = process.env.CAMERA_STATUS_TOKEN;
  const authorized =
    process.env.NODE_ENV !== "production" ||
    (Boolean(expectedToken) &&
      request.headers.get("x-status-token") === expectedToken);

  if (!authorized) {
    return Response.json(
      { error: "Defina CAMERA_STATUS_TOKEN e envie o cabeçalho x-status-token." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    delayMs?: number;
    onlyUnknown?: boolean;
    region?: string | null;
    neighborhood?: string | null;
  };

  try {
    const report = await runCameraStatusBatch({
      limit: typeof body.limit === "number" ? body.limit : undefined,
      delayMs: typeof body.delayMs === "number" ? body.delayMs : undefined,
      onlyUnknown: body.onlyUnknown,
      region: typeof body.region === "string" ? body.region : null,
      neighborhood:
        typeof body.neighborhood === "string" ? body.neighborhood : null,
    });

    return Response.json(report);
  } catch (error) {
    console.error("Falha ao verificar o status das câmeras:", error);
    return Response.json(
      { error: "Não foi possível verificar o status das câmeras." },
      { status: 500 },
    );
  }
}
