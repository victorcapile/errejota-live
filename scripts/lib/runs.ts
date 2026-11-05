import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ingestRuns } from "@/db/schema";

/** Abre um registro de execução e devolve o id para finalizar depois. */
export async function startIngestRun(job: string): Promise<string> {
  const id = `ingest_${job}_${randomUUID()}`;
  await db.insert(ingestRuns).values({
    id,
    job,
    status: "running",
    startedAt: new Date().toISOString(),
    itemsProcessed: 0,
  });
  return id;
}

export async function finishIngestRun(
  id: string,
  status: "success" | "partial" | "failed",
  itemsProcessed: number,
  errorMessage?: string | null,
  notes?: string | null,
): Promise<void> {
  await db
    .update(ingestRuns)
    .set({
      status,
      finishedAt: new Date().toISOString(),
      itemsProcessed,
      errorMessage: errorMessage ?? null,
      notes: notes ?? null,
    })
    .where(eq(ingestRuns.id, id));
}
