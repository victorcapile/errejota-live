import Link from "next/link";
import { Eye } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Sauron — página inicial"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-sm transition-colors group-hover:bg-brand-strong">
            <Eye aria-hidden className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight text-foreground">
              Rio em Foco
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:block">
              Mapa do Rio · v0.9 beta
            </span>
          </span>
        </Link>

        <SiteNav />

        <div className="flex shrink-0 items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
