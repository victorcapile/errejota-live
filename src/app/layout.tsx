import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const THEME_SCRIPT = `try{var t=localStorage.getItem("errejota-theme");if(t==null){t=localStorage.getItem("theme");}document.documentElement.dataset.theme=t==="dark"?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}`;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://errejota.live";

const SITE_TITLE = "Errejota — Ferramenta OSINT do Rio de Janeiro";
const SITE_DESCRIPTION =
  "Ferramenta OSINT de mapeamento de fontes públicas de câmeras e contexto urbano do Rio de Janeiro. Links oficiais, status declarado e proveniência, sem players.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Errejota",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Errejota",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg?v=2",
    shortcut: "/icon.svg?v=2",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Errejota",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f4c5c",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="conteudo" className="flex-1">
              {children}
            </main>
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
