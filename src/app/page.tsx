import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/MapExplorer";
import { MapSkeleton } from "@/components/map/MapSkeleton";
import { getMapMeta } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Errejota Live",
  description:
    "Mapa interativo de fontes públicas catalogadas no Rio de Janeiro, com notícias e canais oficiais por região. Links oficiais, sem player e sem transmissão ao vivo.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapHome />
    </Suspense>
  );
}

async function MapHome() {
  await connection();
  const meta = await getMapMeta();

  return <MapExplorer meta={meta} />;
}
