import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Errejota — Ferramenta OSINT",
    short_name: "Errejota",
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
        src: "/icon.svg?v=2",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
