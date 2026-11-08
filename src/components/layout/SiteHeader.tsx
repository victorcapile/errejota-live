"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SiteNav } from "./SiteNav";
import { StageBanner } from "./StageBanner";

export function SiteHeader() {
  const pathname = usePathname();
  const isMap = pathname === "/";
  const isAbout = pathname.startsWith("/sobre");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div
        className={`mx-auto h-14 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:gap-6 sm:px-6 ${
          isMap ? "hidden lg:grid" : "grid"
        }`}
      >
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 justify-self-start"
          aria-label="errejota.live — página inicial"
        >
          <span className="relative grid size-8 place-items-center rounded-[2px] bg-brand text-background transition-colors group-hover:bg-brand-strong">
            <Eye aria-hidden className="size-4" />
          </span>
          <span className="leading-none max-[399px]:hidden">
            <span className="block font-editorial text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              errejota<span className="text-accent">.</span>live
            </span>
            <span className="mt-1 hidden font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted lg:block">
              Rio de Janeiro · atlas urbano
            </span>
          </span>
        </Link>

        <SiteNav />

        <div
          className={`flex shrink-0 items-center gap-2 justify-self-end ${
            isAbout ? "hidden lg:flex" : ""
          }`}
        >
          <ThemeToggle />
        </div>
      </div>
      <StageBanner />
    </header>
  );
}
