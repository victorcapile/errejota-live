import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { Eye } from "lucide-react";
import { PresenceBadge } from "@/components/presence/PresenceBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SiteNav } from "./SiteNav";

const brandFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="errejota.live — página inicial"
        >
          <span className="relative grid size-9 place-items-center rounded-2xl bg-brand text-white shadow-sm ring-1 ring-brand/20 transition-colors group-hover:bg-brand-strong">
            <Eye aria-hidden className="size-[18px]" />
          </span>
          <span className="leading-tight max-[359px]:hidden">
            <span
              className={`${brandFont.className} block text-base font-bold tracking-tight text-foreground sm:text-lg`}
            >
              errejota.live
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted lg:block">
              Rio de Janeiro em tempo real · v1.3.2
            </span>
          </span>
        </Link>

        <SiteNav />

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden lg:block">
            <PresenceBadge />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
