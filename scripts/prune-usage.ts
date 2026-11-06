import { closeDb } from "../src/db";
import { pruneUsageData } from "../src/lib/usage";

async function main() {
  const result = await pruneUsageData();
  console.log(`Localizações removidas: ${result.locations}`);
  console.log(`Eventos removidos: ${result.events}`);
  await closeDb();
}

void main();
