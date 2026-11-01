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
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:border-brand/30 hover:text-brand"
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
    </button>
  );
}
