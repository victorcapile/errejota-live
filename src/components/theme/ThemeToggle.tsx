"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, mounted, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo noturno"}
      title={isDark ? "Modo claro" : "Modo noturno"}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-2 text-muted transition-colors hover:border-brand/30 hover:text-brand sm:h-9 lg:px-2.5"
    >
      {mounted ? (
        isDark ? (
          <Sun aria-hidden className="size-4" />
        ) : (
          <Moon aria-hidden className="size-4" />
        )
      ) : (
        <span className="size-4" aria-hidden />
      )}
      {mounted ? (
        <span className="hidden text-[11px] font-medium lg:inline">
          {isDark ? "Dia" : "Noite"}
        </span>
      ) : null}
    </button>
  );
}
