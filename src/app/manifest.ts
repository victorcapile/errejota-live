import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rio em Foco — catálogo de fontes públicas do Rio",
    short_name: "Rio em Foco",
    description:
      "Catálogo geográfico de fontes públicas de câmeras e contexto urbano do Rio de Janeiro. Links oficiais, status declarado e proveniência, sem players.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f3ea",
    theme_color: "#0f4c5c",
    lang: "pt-BR",
    categories: ["reference", "education", "government"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
