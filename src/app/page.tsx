import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/MapExplorer";
import { MapSkeleton } from "@/components/map/MapSkeleton";
import { getMapMeta } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Mapa das fontes públicas do Rio",
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
  const meta = await getMapMeta();

  return <MapExplorer meta={meta} />;
}
